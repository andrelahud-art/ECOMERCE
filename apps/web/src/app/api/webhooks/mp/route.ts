import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import crypto from "node:crypto";

function verifySignature(req: NextRequest, raw: string) {
  const secret = process.env.MP_WEBHOOK_SECRET!;
  const h = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const provided = req.headers.get("x-signature") || "";
  return provided === h;
}

export async function POST(req: NextRequest) {
  const urlSecret = req.nextUrl.searchParams.get("secret");
  if (urlSecret !== process.env.MP_WEBHOOK_SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  const raw = await req.text();
  // if (!verifySignature(req, raw)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = JSON.parse(raw);

  try {
    const paymentId = data?.data?.id?.toString();
    if (paymentId) {
      await prisma.order.updateMany({
        where: { paymentRef: paymentId },
        data: { status: "PAID", paymentStatus: "APPROVED" }
      });
    }
  } catch (e) {
    console.error(e);
  }
  return NextResponse.json({ ok: true });
}
