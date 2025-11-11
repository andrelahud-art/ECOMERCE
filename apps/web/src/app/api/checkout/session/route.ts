import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import MercadoPagoConfig, { Preference } from "mercadopago";

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const variantId = String(body.get("variantId"));
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true, prices: true }
  });
  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  const price = variant.prices[0];
  if (!price) return NextResponse.json({ error: "No price" }, { status: 400 });

  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
  const pref = await new Preference(mp).create({
    body: {
      items: [{
        id: variant.id,
        title: `${variant.product.title}`,
        quantity: 1,
        currency_id: "MXN",
        unit_price: Number(price.sale)
      }],
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/gracias`,
        failure: `${process.env.NEXTAUTH_URL}/checkout-error`,
        pending: `${process.env.NEXTAUTH_URL}/checkout-pendiente`
      },
      notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mp?secret=${process.env.MP_WEBHOOK_SECRET}`
    }
  });

  await prisma.order.create({
    data: {
      status: "DRAFT",
      paymentProv: "MP",
      paymentRef: pref.id!,
      paymentStatus: "PENDING",
      subtotal: price.sale,
      shipping: 0,
      discount: 0,
      taxes: 0,
      grandTotal: price.sale,
      email: "guest@rematesonlines.mx",
      shipTo: {}
    }
  });

  return NextResponse.redirect(pref.init_point!, { status: 302 });
}
