import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import MercadoPagoConfig, { Preference } from "mercadopago";
import { reserveStock, InsufficientStockError } from "@/server/services/inventory";
import { getSkydropxQuotes } from "@/server/services/shipping";

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const variantId = String(body.get("variantId"));
    const quantity = parseInt(String(body.get("qty") || "1"));

    // Basic shipping info (in real app, collect from form)
    const email = String(body.get("email") || "guest@rematesonlines.mx");
    const name = String(body.get("name") || "Cliente");
    const phone = String(body.get("phone") || "");
    const zipTo = String(body.get("zip") || "03100");

    // Get variant with product and pricing
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        prices: { where: { channel: "WEB" }, orderBy: { startAt: "desc" } },
        inventory: true
      }
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const price = variant.prices[0];
    if (!price) {
      return NextResponse.json({ error: "No price available" }, { status: 400 });
    }

    // Check and reserve inventory
    try {
      await reserveStock([{ variantId: variant.id, quantity }]);
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return NextResponse.json({
          error: "Stock insuficiente",
          details: `Solo quedan ${error.available} unidades disponibles`
        }, { status: 400 });
      }
      throw error;
    }

    // Get shipping quotes (for now use first available)
    const quotes = await getSkydropxQuotes({
      zipFrom: "03100", // Warehouse zip
      zipTo: zipTo,
      weight: 1, // Default 1kg
      length: 30,
      width: 20,
      height: 10,
    });

    const shippingCost = quotes[0]?.price || 79;

    // Calculate totals
    const subtotal = Number(price.sale) * quantity;
    const shipping = shippingCost;
    const taxes = 0; // IVA included in price
    const discount = 0;
    const grandTotal = subtotal + shipping + taxes - discount;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        status: "DRAFT",
        paymentProv: "MP",
        paymentStatus: "PENDING",
        subtotal,
        shipping,
        discount,
        taxes,
        grandTotal,
        email,
        phone,
        shipTo: {
          name,
          zip: zipTo,
          // In real app, collect full address
        },
        items: {
          create: [{
            variantId: variant.id,
            qty: quantity,
            unitPrice: price.sale,
            discount: 0,
            taxRate: 0,
          }]
        }
      },
      include: { items: true }
    });

    // Create Mercado Pago preference
    const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const pref = await new Preference(mp).create({
      body: {
        items: [{
          id: variant.sku,
          title: `${variant.product.title}`,
          quantity,
          currency_id: "MXN",
          unit_price: Number(price.sale)
        }],
        shipments: {
          cost: shipping,
          mode: "not_specified",
        },
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/gracias?orderId=${order.id}`,
          failure: `${process.env.NEXTAUTH_URL}/checkout-error?orderId=${order.id}`,
          pending: `${process.env.NEXTAUTH_URL}/checkout-pendiente?orderId=${order.id}`
        },
        auto_return: "approved",
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mp?secret=${process.env.MP_WEBHOOK_SECRET}`,
        external_reference: order.id,
        payer: {
          email,
          name,
          phone: phone ? { number: phone } : undefined,
        },
      }
    });

    // Update order with payment reference
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: pref.id! }
    });

    // Redirect to Mercado Pago
    return NextResponse.redirect(pref.init_point!, { status: 302 });

  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({
      error: "Error creating checkout session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
