#!/usr/bin/env bash
set -euo pipefail

mkdir -p apps/web packages/ui packages/config packages/schemas scripts

cat > apps/web/package.json <<'JSON'
{
  "name": "@ro/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev --name init",
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^1.6.0",
    "@mercadopago/sdk-react": "^0.2.6",
    "@prisma/client": "^5.20.0",
    "@tanstack/react-query": "^5.59.0",
    "@upstash/ratelimit": "^1.1.3",
    "@upstash/redis": "^1.34.3",
    "@vercel/analytics": "^1.3.1",
    "@vercel/speed-insights": "^1.0.12",
    "algoliasearch": "^4.24.0",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^11.3.31",
    "ky": "^1.7.2",
    "lucide-react": "^0.470.0",
    "mercadopago": "^2.2.6",
    "next": "15.0.3",
    "next-auth": "^5.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "resend": "^4.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.7.9",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "eslint": "^9.13.0",
    "eslint-config-next": "15.0.3",
    "postcss": "^8.4.47",
    "prisma": "^5.20.0",
    "tailwindcss": "^3.4.14",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3"
  }
}
JSON

# Next.js boilerplate
mkdir -p apps/web/src/{app,components,lib,server,styles} apps/web/prisma apps/web/src/app/api/{checkout/session,webhooks/mp,shipping/quote}

cat > apps/web/next.config.ts <<'TS'
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  experimental: { typedRoutes: true },
  images: { remotePatterns: [] }
};
export default nextConfig;
TS

cat > apps/web/tailwind.config.ts <<'TS'
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
};
export default config;
TS

cat > apps/web/postcss.config.mjs <<'JS'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
JS

cat > apps/web/src/styles/globals.css <<'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;
CSS

# Prisma
cat > apps/web/prisma/schema.prisma <<'PRISMA'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  phone     String?  @db.VarChar(20)
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  accounts  Account[]
  sessions  Session[]
  addresses Address[]
  orders    Order[]
}

enum Role { ADMIN OPS CUSTOMER }

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Address {
  id        String   @id @default(cuid())
  userId    String?
  fullName  String
  phone     String
  street1   String
  street2   String?
  city      String
  state     String
  zip       String
  country   String   @default("MX")
  isDefault Boolean  @default(false)
  user      User?    @relation(fields: [userId], references: [id])
}

model Product {
  id           String    @id @default(cuid())
  slug         String    @unique
  title        String
  brand        String
  model        String?
  condition    Condition @default(OPENBOX)
  grade        Grade     @default(A)
  warrantyDays Int       @default(30)
  specs        Json
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  variants     ProductVariant[]
  assets       Asset[]
}

enum Condition { NEW OPENBOX REFURB }
enum Grade { A B C }

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  sku       String  @unique
  ean       String?
  color     String?
  storage   String?
  attributes Json
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  inventory Inventory?
  prices    Price[]
  orderItems OrderItem[]
  assets    Asset[]
}

model Inventory {
  id           String @id @default(cuid())
  variantId    String @unique
  qtyAvailable Int    @default(0)
  qtyReserved  Int    @default(0)
  cost         Decimal @db.Decimal(10,2)
  locationBin  String?
  lastCheck    DateTime @default(now())
  variant      ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
}

model Price {
  id        String   @id @default(cuid())
  variantId String
  list      Decimal  @db.Decimal(10,2)
  sale      Decimal  @db.Decimal(10,2)
  floorMin  Decimal  @db.Decimal(10,2)
  channel   Channel  @default(WEB)
  startAt   DateTime @default(now())
  endAt     DateTime?
  variant   ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
}
enum Channel { WEB ML }

model Order {
  id            String        @id @default(cuid())
  userId        String?
  status        OrderStatus   @default(DRAFT)
  paymentProv   String?
  paymentRef    String?
  paymentStatus PaymentStatus @default(PENDING)
  subtotal      Decimal       @db.Decimal(10,2)
  shipping      Decimal       @db.Decimal(10,2)
  discount      Decimal       @db.Decimal(10,2)
  taxes         Decimal       @db.Decimal(10,2)
  grandTotal    Decimal       @db.Decimal(10,2)
  email         String
  phone         String?
  shipTo        Json
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  user          User?         @relation(fields: [userId], references: [id])
  items         OrderItem[]
  shipment      Shipment?
}
enum OrderStatus { DRAFT PAID PICKING SHIPPED DELIVERED RETURNED }
enum PaymentStatus { PENDING APPROVED REJECTED REFUNDED }

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  variantId String
  qty       Int
  unitPrice Decimal @db.Decimal(10,2)
  discount  Decimal @db.Decimal(10,2)
  taxRate   Decimal @db.Decimal(5,2)
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant   ProductVariant @relation(fields: [variantId], references: [id])
}

model Shipment {
  id        String   @id @default(cuid())
  orderId   String   @unique
  carrier   String
  tracking  String
  labelUrl  String
  eta       DateTime?
  cost      Decimal @db.Decimal(10,2)
  insured   Boolean @default(false)
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model Asset {
  id           String   @id @default(cuid())
  productId    String?
  variantId    String?
  type         AssetType
  urlOriginal  String
  urlOptimized String?
  createdAt    DateTime @default(now())
  product      Product? @relation(fields: [productId], references: [id])
  variant      ProductVariant? @relation(fields: [variantId], references: [id])
}
enum AssetType { IMG VIDEO PDF }

model AuditLog {
  id      String   @id @default(cuid())
  actorId String?
  action  String
  entity  String
  before  Json?
  after   Json?
  at      DateTime @default(now())
}
PRISMA

# seed
cat > apps/web/prisma/seed.ts <<'TS'
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const skus = Array.from({ length: 30 }).map((_, i) => ({
  slug: `producto-${i+1}`,
  title: `Producto Electrónico ${i+1}`,
  brand: i % 2 ? "Auratech" : "Voltix",
  model: `MX-${1000 + i}`,
  condition: "OPENBOX" as const,
  grade: (["A","A","B","C"] as const)[i % 4],
  warrantyDays: 30,
  specs: { bt: "5.3", battery: `${24 + (i%6)}h`, port: "USB-C" },
  variant: {
    sku: `SKU-${(i+1).toString().padStart(4,"0")}`,
    attributes: { color: ["Black","White","Blue"][i%3] }
  },
  pricing: { list: 999 + i*10, sale: 799 + i*10, floorMin: 749 + i*10 },
  inventory: { qty: 10 + (i%7), cost: 499 + i*5 }
}));

async function main() {
  for (const s of skus) {
    await db.product.create({
      data: {
        slug: s.slug,
        title: s.title,
        brand: s.brand,
        model: s.model,
        condition: "OPENBOX",
        grade: s.grade as any,
        warrantyDays: s.warrantyDays,
        specs: s.specs as any,
        variants: {
          create: [{
            sku: s.variant.sku,
            attributes: s.variant.attributes as any,
            inventory: { create: { qtyAvailable: s.inventory.qty, cost: s.inventory.cost } },
            prices: { create: { list: s.pricing.list, sale: s.pricing.sale, floorMin: s.pricing.floorMin } }
          }]
        }
      }
    });
  }
  console.log("Seed OK: 30 SKUs creados");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
TS

# env
cat > apps/web/.env.example <<'ENV'
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="changeme"

# Opcionales OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Mercado Pago
MP_ACCESS_TOKEN=""
MP_PUBLIC_KEY=""
MP_WEBHOOK_SECRET="random-hmac-secret"

# Conekta (fallback, opcional)
CONEKTA_API_KEY=""
CONEKTA_WEBHOOK_SECRET=""

# Almacenamiento (R2/S3)
S3_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="rematesonlines"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""

# Envíos
SKYDROPX_TOKEN=""
NINETY9_TOKEN=""

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Email
RESEND_API_KEY=""
FROM_EMAIL="ordenes@rematesonlines.mx"
ENV

# basic app shell
cat > apps/web/src/app/layout.tsx <<'TSX'
import "@/styles/globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "RematesOnlines.mx",
  description: "Electrónicos verificados a precio de remate"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold">RematesOnlines.mx</a>
            <nav className="flex gap-4 text-sm">
              <a href="/productos">Productos</a>
              <a href="/soporte">Soporte</a>
              <a href="/admin">Admin</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t py-8 text-sm">
          <div className="mx-auto max-w-6xl px-4">
            © {new Date().getFullYear()} RematesOnlines.mx
          </div>
        </footer>
      </body>
    </html>
  );
}
TSX

cat > apps/web/src/app/page.tsx <<'TSX'
import Link from "next/link";
export default function Home() {
  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border p-8">
        <h1 className="text-3xl font-semibold">Electrónicos verificados a precio de remate</h1>
        <p className="mt-2 text-zinc-600">Compra segura, envío en 24–72h.</p>
        <div className="mt-6">
          <Link className="inline-flex rounded-xl bg-black px-5 py-3 text-white" href="/productos">
            Comprar ahora
          </Link>
        </div>
      </div>
    </section>
  );
}
TSX

cat > apps/web/src/server/db.ts <<'TS'
import { PrismaClient } from "@prisma/client";
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
TS

cat > apps/web/src/app/productos/page.tsx <<'TSX'
import { prisma } from "@/server/db";
import Link from "next/link";

export default async function PLP() {
  const products = await prisma.product.findMany({
    include: { variants: { include: { prices: true, inventory: true } }, assets: true }
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map(p => {
        const v = p.variants[0];
        const price = v?.prices[0];
        return (
          <Link key={p.id} href={`/producto/${p.slug}`} className="rounded-xl border p-4 hover:shadow-sm">
            <div className="aspect-square bg-zinc-100 rounded-lg" />
            <h3 className="mt-3 font-medium">{p.title}</h3>
            <p className="text-zinc-600 text-sm">{p.brand}</p>
            {price && <p className="mt-1 text-lg font-semibold">${Number(price.sale).toFixed(2)}</p>}
          </Link>
        );
      })}
    </div>
  );
}
TSX

cat > apps/web/src/app/producto/[slug]/page.tsx <<'TSX'
import { prisma } from "@/server/db";
import { notFound } from "next/navigation";

export default async function PDP({ params }: { params: { slug: string } }) {
  const p = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { variants: { include: { prices: true, inventory: true } }, assets: true }
  });
  if (!p) return notFound();
  const v = p.variants[0];
  const price = v?.prices[0];
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="rounded-2xl bg-zinc-100 aspect-square" />
      <div>
        <h1 className="text-2xl font-semibold">{p.title}</h1>
        <p className="text-sm text-zinc-600">{p.brand}</p>
        {price && <p className="mt-2 text-2xl font-bold">${Number(price.sale).toFixed(2)}</p>}
        <form action="/api/checkout/session" method="post" className="mt-6">
          <input type="hidden" name="variantId" value={v?.id} />
          <button className="rounded-xl bg-black text-white px-5 py-3">Comprar ahora</button>
        </form>
        <div className="mt-6 text-sm text-zinc-700">
          <p>Condición: {p.condition} · Grado: {p.grade}</p>
          <p>Garantía: {p.warrantyDays} días</p>
        </div>
      </div>
    </div>
  );
}
TSX

cat > apps/web/src/app/api/checkout/session/route.ts <<'TS'
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
TS

cat > apps/web/src/app/api/webhooks/mp/route.ts <<'TS'
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
TS

cat > apps/web/src/app/api/shipping/quote/route.ts <<'TS'
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const { zip, weight } = await req.json();
  return NextResponse.json({
    carriers: [
      { name: "99minutos", price: 79, etaDays: 1 },
      { name: "DHL", price: 129, etaDays: 2 }
    ],
    input: { zip, weight }
  });
}
TS

cat > apps/web/src/app/(store)/admin/page.tsx <<'TSX'
import { prisma } from "@/server/db";
export default async function Admin() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Pedidos</h1>
      <table className="w-full text-sm">
        <thead><tr><th className="text-left">ID</th><th>Estado</th><th>Total</th><th>Creado</th></tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-t">
              <td className="py-2">{o.id}</td>
              <td className="text-center">{o.status}</td>
              <td className="text-center">${Number(o.grandTotal).toFixed(2)}</td>
              <td className="text-center">{o.createdAt.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
TSX

echo "OK"
