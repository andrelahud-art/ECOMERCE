# 🚀 Setup Guide - RematesOnlines.mx

## ✅ Phase 1 Scaffold - COMPLETADO

El scaffold incluye:
- ✅ Next.js 15 + React 19 + TypeScript
- ✅ Prisma con 14 modelos (Product, Variant, Inventory, Order, User, etc.)
- ✅ Mercado Pago checkout + webhook
- ✅ PLP/PDP funcionales
- ✅ Admin de pedidos
- ✅ 30 SKUs de ejemplo
- ✅ Estructura monorepo con pnpm

---

## 📋 Pasos de Instalación Local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edita `apps/web/.env.local` con tus valores:

#### **Base de datos (OBLIGATORIO)**
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
```

**Opciones recomendadas:**
- [Neon](https://neon.tech) - Postgres serverless (free tier)
- [Supabase](https://supabase.com) - Postgres con extras (free tier)
- [Railway](https://railway.app) - Postgres + hosting

#### **Autenticación**
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-random-con-openssl-rand-base64-32"
```

#### **Mercado Pago (para probar checkout)**
```env
MP_ACCESS_TOKEN="APP_USR-xxxxx"  # Test o Production
MP_PUBLIC_KEY="APP_USR-xxxxx"
MP_WEBHOOK_SECRET="random-string-para-hmac"
```

Obtén las claves en: https://www.mercadopago.com.mx/developers/panel/credentials

### 3. Inicializar base de datos

```bash
pnpm db:push
```

Esto crea todas las tablas según el schema de Prisma.

### 4. Poblar con datos de ejemplo

```bash
pnpm seed
```

Crea 30 productos de ejemplo (Auratech, Voltix) con variantes, precios e inventario.

### 5. Arrancar desarrollo

```bash
pnpm dev
```

Abre: http://localhost:3000

---

## 🧪 Flujo de Prueba Completo

### 1. Ver catálogo
http://localhost:3000/productos

### 2. Ver producto individual
Clic en cualquier producto → http://localhost:3000/producto/producto-1

### 3. Probar checkout (requiere MP_ACCESS_TOKEN)
- Clic en **"Comprar ahora"**
- Te redirige a Mercado Pago
- Completa el pago (sandbox o test)
- Webhook actualiza orden automáticamente

### 4. Ver pedidos en admin
http://localhost:3000/admin

---

## 🔧 Webhooks (para probar pagos end-to-end)

### Opción A: ngrok (recomendado para local)

```bash
ngrok http 3000
```

Copia la URL pública (ej: `https://abc123.ngrok.io`) y configura en Mercado Pago:

**URL del webhook:**
```
https://abc123.ngrok.io/api/webhooks/mp?secret=TU_MP_WEBHOOK_SECRET
```

### Opción B: Vercel Deploy (para staging)

```bash
vercel deploy
```

Usa la URL de Vercel en la configuración de webhooks de MP.

---

## 📊 Estructura de Archivos

```
/
├── apps/
│   └── web/                    # Next.js app principal
│       ├── src/
│       │   ├── app/            # App Router
│       │   │   ├── page.tsx            # Home
│       │   │   ├── productos/          # PLP
│       │   │   ├── producto/[slug]/    # PDP
│       │   │   ├── admin/              # Panel admin
│       │   │   └── api/
│       │   │       ├── checkout/session/  # Crear sesión MP
│       │   │       ├── webhooks/mp/       # Webhook MP
│       │   │       └── shipping/quote/    # Cotizaciones envío
│       │   ├── server/
│       │   │   └── db.ts       # Prisma client
│       │   └── styles/
│       │       └── globals.css # Tailwind
│       ├── prisma/
│       │   ├── schema.prisma   # Modelos DB (14+)
│       │   └── seed.ts         # 30 SKUs ejemplo
│       └── package.json
├── packages/                   # Shared packages (futuro)
├── scripts/
│   └── init.sh                # Script de bootstrap
├── package.json               # Root workspace
└── pnpm-workspace.yaml
```

---

## 🗄️ Modelos de Datos (Prisma)

### Principales tablas:

- **User** - Usuarios (clientes, admin, ops)
- **Product** - Productos (título, marca, condición, grado, specs)
- **ProductVariant** - Variantes (SKU, color, storage, EAN)
- **Inventory** - Inventario (qty disponible/reservado, costo, ubicación)
- **Price** - Precios (list, sale, floorMin, canal, fechas)
- **Order** - Órdenes (status, payment, totals, email, shipTo)
- **OrderItem** - Items de orden (variantId, qty, precios)
- **Shipment** - Envíos (carrier, tracking, label, ETA)
- **Asset** - Imágenes/videos/PDFs
- **Address** - Direcciones de envío
- **AuditLog** - Auditoría de cambios

---

## 🛣️ Rutas Disponibles

### Frontend
- `/` - Home con hero y CTA
- `/productos` - Catálogo (PLP)
- `/producto/[slug]` - Detalle de producto (PDP)
- `/admin` - Panel de pedidos (sin auth aún)

### API
- `POST /api/checkout/session` - Crear preferencia de pago MP
- `POST /api/webhooks/mp` - Recibir notificaciones de pago
- `POST /api/shipping/quote` - Cotizar envío (stub)

---

## 🔐 Variables de Entorno (todas)

```env
# Base de datos (OBLIGATORIO)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="changeme"

# OAuth (opcional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Mercado Pago
MP_ACCESS_TOKEN=""
MP_PUBLIC_KEY=""
MP_WEBHOOK_SECRET="random-hmac-secret"

# Conekta (fallback, opcional)
CONEKTA_API_KEY=""
CONEKTA_WEBHOOK_SECRET=""

# Storage (R2/S3)
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
```

---

## 🚨 Troubleshooting

### "PrismaClient is unable to run in this browser environment"

→ Asegúrate de importar `prisma` solo en Server Components o API Routes, nunca en Client Components.

### "Invalid `prisma.xxx.findMany()` invocation"

→ Revisa que `DATABASE_URL` en `.env.local` sea correcta y la DB esté accesible.

### Webhook de Mercado Pago no actualiza orden

1. Verifica que `MP_WEBHOOK_SECRET` sea el mismo en `.env.local` y en la URL del webhook
2. Checa logs en la consola de Next.js
3. Valida que el `paymentRef` coincida con el ID de la preferencia de MP

### "Module not found: Can't resolve '@/server/db'"

→ Ejecuta `pnpm install` desde la raíz para generar `@prisma/client`

---

## ✅ Checklist Pre-Deploy

- [ ] `DATABASE_URL` configurado
- [ ] `NEXTAUTH_SECRET` generado (no uses "changeme")
- [ ] `MP_ACCESS_TOKEN` de producción
- [ ] Webhook público configurado en MP
- [ ] `pnpm db:push` ejecutado
- [ ] Seeds cargados (`pnpm seed`)
- [ ] Tests locales: PLP → PDP → Checkout → Webhook → Admin
- [ ] `.env.local` en `.gitignore` (no commitear secretos)

---

## 🎯 Siguientes pasos (Push A)

1. **Reserva atómica de inventario**: al aprobar pago, decrementar `qtyAvailable` con transacción
2. **Compra de guía**: integrar Skydropx/99minutos tras `ORDER.PAID`
3. **Email confirmación**: usar Resend con plantilla profesional
4. **Página "Gracias"**: mostrar resumen de orden + tracking

## 🔮 Siguientes pasos (Push B)

1. **SEO**: sitemap.xml, schema.org Product/Offer, meta tags
2. **Búsqueda**: Algolia/Typesense con facetas (marca, precio, grado)
3. **RBAC**: proteger `/admin` con NextAuth + role check
4. **Upload real**: UploadThing + Cloudflare R2 para fotos de productos

---

## 📞 Soporte

Si algo falla:
1. Checa logs en consola de Next.js
2. Valida `.env.local`
3. Revisa Prisma Studio: `npx prisma studio`
4. Verifica credenciales de Mercado Pago

---

**¡Listo para convertir inventario en efectivo! 💰**
