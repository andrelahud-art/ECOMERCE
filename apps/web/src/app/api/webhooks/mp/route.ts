import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { commitStock, releaseStock } from "@/server/services/inventory";
import { purchaseSkydropxLabel, getWarehouseAddress } from "@/server/services/shipping";
import { sendOrderConfirmation, sendShipmentNotification } from "@/server/services/email";

/**
 * Mercado Pago Webhook Handler
 * Processes payment notifications and triggers fulfillment flow
 */
export async function POST(req: NextRequest) {
  // Verify webhook secret in URL
  const urlSecret = req.nextUrl.searchParams.get("secret");
  if (urlSecret !== process.env.MP_WEBHOOK_SECRET) {
    console.error("❌ Invalid webhook secret");
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("📥 MP Webhook received:", JSON.stringify(body, null, 2));

    // Extract payment info
    const action = body.action;
    const type = body.type;

    // We're interested in payment notifications
    if (type !== "payment" || action !== "payment.updated") {
      console.log("ℹ️ Ignoring non-payment notification");
      return NextResponse.json({ ok: true, message: "Ignored" });
    }

    const paymentId = body.data?.id?.toString();
    if (!paymentId) {
      console.error("❌ No payment ID in webhook");
      return NextResponse.json({ ok: false, error: "No payment ID" }, { status: 400 });
    }

    // Find order by external_reference (orderId)
    const externalRef = body.external_reference;
    let order = null;

    if (externalRef) {
      order = await prisma.order.findFirst({
        where: { id: externalRef },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      });
    }

    // Fallback: try finding by paymentRef
    if (!order) {
      order = await prisma.order.findFirst({
        where: { paymentRef: paymentId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      });
    }

    if (!order) {
      console.error("❌ Order not found for payment:", paymentId);
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    // Check if already processed
    if (order.status === "PAID" || order.status === "SHIPPED") {
      console.log("ℹ️ Order already processed:", order.id);
      return NextResponse.json({ ok: true, message: "Already processed" });
    }

    console.log("✅ Found order:", order.id);

    // Update order to PAID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentStatus: "APPROVED",
        paymentRef: paymentId, // Store actual payment ID
      }
    });

    console.log("💳 Payment approved for order:", order.id);

    // === FULFILLMENT FLOW ===

    try {
      // 1. Commit inventory (atomic decrement)
      const inventoryItems = order.items.map(item => ({
        variantId: item.variantId,
        quantity: item.qty
      }));

      await commitStock(inventoryItems);
      console.log("📦 Inventory committed:", inventoryItems);

      // 2. Purchase shipping label
      const shipTo = order.shipTo as any;
      const warehouseAddr = getWarehouseAddress();

      // Build shipping address from order (fallback to defaults)
      const shippingAddress = {
        name: shipTo.name || "Cliente",
        street1: shipTo.street1 || "Calle ejemplo 123",
        street2: shipTo.street2,
        city: shipTo.city || "Ciudad de México",
        state: shipTo.state || "CDMX",
        zip: shipTo.zip || "03100",
        country: "MX",
        phone: order.phone || "5512345678",
        email: order.email
      };

      const label = await purchaseSkydropxLabel({
        orderId: order.id,
        addressFrom: warehouseAddr,
        addressTo: shippingAddress,
        parcel: {
          weight: 1, // TODO: calculate from products
          length: 30,
          width: 20,
          height: 10,
        },
        insuredAmount: Number(order.grandTotal),
      });

      console.log("🚚 Shipping label purchased:", label.trackingNumber);

      // 3. Save shipment info
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          carrier: label.carrier,
          tracking: label.trackingNumber,
          labelUrl: label.labelUrl,
          eta: label.estimatedDelivery,
          cost: label.cost,
          insured: true,
        }
      });

      // Update order status to SHIPPED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "SHIPPED" }
      });

      console.log("📮 Shipment created for order:", order.id);

      // 4. Send confirmation email
      await sendOrderConfirmation({
        orderId: order.id,
        email: order.email,
        customerName: shipTo.name,
        items: order.items.map(item => ({
          title: item.variant.product.title,
          quantity: item.qty,
          price: Number(item.unitPrice)
        })),
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        total: Number(order.grandTotal),
        shippingAddress: {
          street1: shippingAddress.street1,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zip: shippingAddress.zip,
        }
      });

      console.log("📧 Order confirmation email sent");

      // 5. Send shipment notification
      await sendShipmentNotification({
        orderId: order.id,
        email: order.email,
        customerName: shipTo.name,
        trackingNumber: label.trackingNumber,
        carrier: label.carrier,
        estimatedDelivery: label.estimatedDelivery,
      });

      console.log("📧 Shipment notification email sent");

      console.log("✅ Fulfillment completed for order:", order.id);

    } catch (fulfillmentError) {
      console.error("❌ Fulfillment error:", fulfillmentError);

      // Rollback inventory if shipping or email fails
      try {
        const inventoryItems = order.items.map(item => ({
          variantId: item.variantId,
          quantity: item.qty
        }));
        await releaseStock(inventoryItems);
        console.log("🔄 Inventory rolled back");
      } catch (rollbackError) {
        console.error("❌ CRITICAL: Rollback failed:", rollbackError);
        // TODO: Alert admin - manual intervention needed
      }

      // Update order status to indicate error
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAID", // Keep as PAID but don't ship yet
          // TODO: Add error field to track issues
        }
      });

      // Return success to MP (we received the webhook, internal error is on us)
      return NextResponse.json({
        ok: true,
        warning: "Payment processed but fulfillment failed",
        orderId: order.id
      });
    }

    return NextResponse.json({ ok: true, orderId: order.id });

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
