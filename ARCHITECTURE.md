# 🏗️ Architecture Overview - RematesOnlines.mx

## 📐 Stack Técnico

### Frontend
- **Framework**: Next.js 15 (App Router)
- **React**: 19.0.0 (latest)
- **TypeScript**: 5.6.3
- **Styling**: TailwindCSS 3.4
- **Routing**: File-based routing con App Router

### Backend
- **API**: Next.js API Routes + Server Actions
- **ORM**: Prisma 5.20
- **Database**: PostgreSQL (compatible con Neon, Supabase, Railway)
- **Auth**: NextAuth v5 (ready, no implementado en Phase 1)

### Pagos
- **Primary**: Mercado Pago (SDK v2.2.6)
- **Fallback**: Conekta (preparado)
- **Webhooks**: HMAC validation

### Infraestructura (recomendada)
- **Hosting**: Vercel (Next.js nativo)
- **Database**: Neon/Supabase (Postgres serverless)
- **Storage**: Cloudflare R2 / AWS S3
- **CDN**: Cloudflare
- **Email**: Resend
- **Analytics**: PostHog

---

## 📊 Data Model (14 tablas)

### Core E-commerce

#### **Product**
```prisma
- id (cuid)
- slug (unique) → SEO-friendly URL
- title, brand, model
- condition (NEW/OPENBOX/REFURB)
- grade (A/B/C)
- warrantyDays
- specs (JSON)
- variants[] (1:N)
- assets[] (1:N)
```

#### **ProductVariant**
```prisma
- id (cuid)
- productId → FK Product
- sku (unique)
- ean, color, storage
- attributes (JSON)
- inventory (1:1)
- prices[] (1:N)
```

#### **Inventory**
```prisma
- variantId (unique) → FK ProductVariant
- qtyAvailable (stock real)
- qtyReserved (carritos activos/órdenes pendientes)
- cost (costo unitario)
- locationBin (ubicación física)
- lastCheck (último conteo)
```

#### **Price**
```prisma
- variantId → FK ProductVariant
- list (precio lista)
- sale (precio venta)
- floorMin (precio mínimo)
- channel (WEB/ML)
- startAt, endAt (vigencia)
```

### Órdenes

#### **Order**
```prisma
- id (cuid)
- userId (opcional para guest checkout)
- status (DRAFT/PAID/PICKING/SHIPPED/DELIVERED/RETURNED)
- paymentProv (MP/Conekta)
- paymentRef (preference ID o payment ID)
- paymentStatus (PENDING/APPROVED/REJECTED/REFUNDED)
- subtotal, shipping, discount, taxes, grandTotal
- email, phone
- shipTo (JSON con dirección)
- items[] (1:N)
- shipment (1:1)
```

#### **OrderItem**
```prisma
- orderId → FK Order
- variantId → FK ProductVariant
- qty
- unitPrice, discount, taxRate
```

#### **Shipment**
```prisma
- orderId (unique) → FK Order
- carrier (99minutos/DHL/Estafeta)
- tracking
- labelUrl (PDF de guía)
- eta (fecha estimada)
- cost, insured
```

### Usuarios y Auth

#### **User**
```prisma
- id (cuid)
- email (unique)
- name, phone
- role (ADMIN/OPS/CUSTOMER)
- accounts[] (OAuth providers)
- sessions[]
- addresses[]
- orders[]
```

#### **Account** (NextAuth)
OAuth providers (Google, Apple, etc.)

#### **Session** (NextAuth)
Sesiones activas

#### **Address**
Direcciones de envío guardadas

### Assets

#### **Asset**
```prisma
- productId / variantId (opcional)
- type (IMG/VIDEO/PDF)
- urlOriginal
- urlOptimized (CDN)
```

### Auditoría

#### **AuditLog**
```prisma
- actorId (userId)
- action (CREATE/UPDATE/DELETE)
- entity (Product/Order/etc)
- before, after (JSON snapshots)
- at (timestamp)
```

---

## 🔄 Flujos Clave

### 1. Flujo de Compra (Implementado)

```
[Usuario]
  ↓ Entra a /productos
[PLP]
  ↓ Clic en producto
[PDP]
  ↓ "Comprar ahora" (form POST)
[API /api/checkout/session]
  ↓ Crea Order (DRAFT)
  ↓ Crea preferencia MP
  ↓ Guarda paymentRef
  ↓ Redirige a MP
[Mercado Pago]
  ↓ Usuario paga
  ↓ Webhook → /api/webhooks/mp
[API /webhooks/mp]
  ↓ Valida HMAC + secret
  ↓ Update Order (PAID)
[Admin Panel]
  ↓ Muestra orden aprobada
```

### 2. Flujo de Inventario (Pendiente - Push A)

```
[Webhook MP: payment approved]
  ↓ Transaction START
[Inventory]
  ↓ Check qtyAvailable >= qty
  ↓ Decrement qtyAvailable
  ↓ Create OrderItem
  ↓ Transaction COMMIT
[Order]
  ↓ Status → PAID
[Shipping API]
  ↓ Comprar guía (Skydropx/99minutos)
  ↓ Create Shipment
[Email]
  ↓ Confirmación + tracking (Resend)
```

### 3. Flujo de Admin (Básico)

```
[/admin]
  ↓ Query: prisma.order.findMany()
  ↓ Show table: ID, Status, Total, Date
```

---

## 🛣️ Routing Structure

```
/                           → Home (Hero + CTA)
/productos                  → PLP (Product List Page)
/producto/[slug]            → PDP (Product Detail Page)
/admin                      → Admin panel (órdenes)

API:
/api/checkout/session       → POST: crear sesión MP
/api/webhooks/mp            → POST: webhook MP
/api/shipping/quote         → POST: cotizar envío
```

---

## 🔐 Security

### Implementado
- ✅ HMAC webhook validation (MP_WEBHOOK_SECRET)
- ✅ Environment variables isolation
- ✅ Type safety (TypeScript)
- ✅ SQL injection prevention (Prisma parameterized queries)

### Pendiente (Push A/B)
- ⏳ Rate limiting (Upstash Redis)
- ⏳ RBAC para /admin (NextAuth roles)
- ⏳ CSRF protection (NextAuth)
- ⏳ Anti-fraud scoring (IP, device fingerprint, historial)
- ⏳ 3DS para pagos de riesgo

---

## 📦 Dependencies

### Production
```json
{
  "@prisma/client": "ORM para DB",
  "mercadopago": "SDK de Mercado Pago",
  "next": "Framework",
  "next-auth": "Autenticación",
  "react": "UI library",
  "zod": "Validación de schemas",
  "resend": "Emails transaccionales",
  "algoliasearch": "Búsqueda (futuro)",
  "@upstash/redis": "Cache y rate limiting (futuro)",
  "ky": "HTTP client",
  "date-fns": "Formateo de fechas",
  "framer-motion": "Animaciones (opcional)"
}
```

### Dev
```json
{
  "prisma": "CLI de Prisma",
  "typescript": "Type safety",
  "tailwindcss": "Styling",
  "tsx": "Ejecutar seed.ts",
  "eslint": "Linting"
}
```

---

## 🎯 Performance Targets (Blueprint)

- **LCP**: < 2.0s
- **INP**: < 200ms
- **CLS**: < 0.05
- **Conversion Rate**: 2.8-3.5%
- **AOV**: MXN 1,200-1,800

### Optimizaciones aplicadas
- ✅ Next.js App Router (RSC)
- ✅ TailwindCSS (CSS minificado)
- ✅ TypeScript (type safety)

### Pendientes
- ⏳ Next Image con AVIF/WebP
- ⏳ CDN para assets (Cloudflare R2)
- ⏳ Database connection pooling
- ⏳ Redis para cache de catálogo
- ⏳ Lazy loading de imágenes
- ⏳ Code splitting

---

## 🧪 Testing Strategy (Pendiente)

### Unit Tests
- Prisma queries
- Server Actions
- Utilities

### Integration Tests
- API routes
- Webhooks
- Payment flows

### E2E Tests (Playwright)
- Checkout completo
- Admin CRUD
- Búsqueda y filtros

### Load Tests (k6)
- Checkout concurrent users
- Webhook burst
- PLP/PDP carga

---

## 📈 Monitoring (Pendiente)

### Errors
- **Sentry**: error tracking + stack traces

### Logs
- **Datadog/Logtail**: structured logging

### Analytics
- **PostHog**: product analytics, funnels, cohortes
- **Vercel Analytics**: Core Web Vitals

### Business Metrics
- CVR por canal
- AOV
- CAC/LTV
- Fill rate
- % órdenes shipped D+0

---

## 🔮 Roadmap

### ✅ Phase 1 (DONE)
- Scaffold completo
- Prisma schema
- Checkout básico MP
- PLP/PDP
- Admin mínimo

### 🚧 Push A (Next)
- Decremento atómico de inventario
- Compra de guía (Skydropx/99minutos)
- Emails con Resend
- Página "Gracias"

### 🔜 Push B
- SEO (sitemap, schema.org)
- Algolia search + facetas
- RBAC admin
- Upload de imágenes (UploadThing + R2)
- Rate limiting

### 🌟 Future
- NextAuth completo (Google OAuth, Magic Link)
- RMA/Returns system
- Bundles y promos
- Reseñas con fotos
- WhatsApp notifications
- A/B testing (Vercel Experiments)
- Anti-fraud scoring
- Conekta fallback automático

---

## 📞 Key Files

### Database
- `apps/web/prisma/schema.prisma` - Schema completo
- `apps/web/prisma/seed.ts` - 30 SKUs de ejemplo

### App
- `apps/web/src/app/layout.tsx` - Layout global
- `apps/web/src/app/page.tsx` - Home
- `apps/web/src/app/productos/page.tsx` - PLP
- `apps/web/src/app/producto/[slug]/page.tsx` - PDP
- `apps/web/src/app/admin/page.tsx` - Admin

### API
- `apps/web/src/app/api/checkout/session/route.ts` - Crear sesión MP
- `apps/web/src/app/api/webhooks/mp/route.ts` - Webhook MP
- `apps/web/src/app/api/shipping/quote/route.ts` - Cotizaciones

### Utils
- `apps/web/src/server/db.ts` - Prisma client singleton

### Config
- `apps/web/next.config.ts` - Next.js config
- `apps/web/tailwind.config.ts` - Tailwind config
- `apps/web/tsconfig.json` - TypeScript config

---

**Arquitectura diseñada para escalar de 0 a 10M MXN GMV/año 🚀**
