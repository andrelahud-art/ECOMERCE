# ⚡ Quick Start - 5 minutos a tienda corriendo

## 1️⃣ Instalar (30 segundos)

```bash
pnpm install
```

## 2️⃣ Configurar DB (2 minutos)

### Opción A: Neon (recomendado - más rápido)

1. Ve a https://neon.tech
2. Crea cuenta gratis
3. Crea proyecto "rematesonlines"
4. Copia el connection string

### Opción B: Supabase

1. Ve a https://supabase.com
2. Crea proyecto
3. Sección Database → Connection string → URI

### Configurar .env

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edita `apps/web/.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cualquier-string-random"
```

## 3️⃣ Inicializar DB (30 segundos)

```bash
pnpm db:push
pnpm seed
```

Esto crea:
- 14 tablas
- 30 productos de ejemplo
- Con precios, inventario y specs

## 4️⃣ Arrancar (10 segundos)

```bash
pnpm dev
```

## 5️⃣ Navegar

- 🏠 Home: http://localhost:3000
- 📦 Catálogo: http://localhost:3000/productos
- 🛒 Producto: http://localhost:3000/producto/producto-1
- 👨‍💼 Admin: http://localhost:3000/admin

---

## 🎯 Para probar PAGOS (opcional)

### 1. Cuenta Mercado Pago

1. Crea cuenta en https://www.mercadopago.com.mx
2. Ve a Developers → Credentials
3. Copia "Access Token" (test)

### 2. Agrega a .env.local

```env
MP_ACCESS_TOKEN="TEST-123456-xxx"
MP_WEBHOOK_SECRET="cualquier-string"
```

### 3. Exponer webhook (ngrok)

```bash
ngrok http 3000
```

Copia URL (ej: `https://abc123.ngrok.io`)

### 4. Configurar webhook en MP

Panel de MP → Webhooks → Nueva notificación:

```
URL: https://abc123.ngrok.io/api/webhooks/mp?secret=tu-webhook-secret
Eventos: Pagos
```

### 5. Probar flujo completo

1. http://localhost:3000/productos
2. Clic en un producto
3. **"Comprar ahora"**
4. Completa pago en MP (usa tarjetas de test)
5. Checa `/admin` para ver orden `PAID`

---

## 🧪 Tarjetas de prueba MP

### Aprobada
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha: 11/25
```

### Rechazada
```
Número: 5031 4332 1540 6351
CVV: 123
Fecha: 11/25
```

Más: https://www.mercadopago.com.mx/developers/es/docs/checkout-api/testing

---

## ✅ Checklist

- [ ] `pnpm install` OK
- [ ] `.env.local` creado con `DATABASE_URL`
- [ ] `pnpm db:push` ejecutado sin errores
- [ ] `pnpm seed` creó 30 productos
- [ ] `pnpm dev` corre en puerto 3000
- [ ] `/productos` muestra 30 productos
- [ ] PDP carga correctamente
- [ ] (Opcional) MP configurado y webhook funciona

---

## 🆘 Problemas comunes

### "PrismaClient is unable to run..."

→ Solo usas Prisma en Server Components o API Routes, no Client Components.

### "Error: P1001: Can't reach database"

→ Revisa `DATABASE_URL` en `.env.local`. Debe ser accesible desde tu máquina.

### Productos no aparecen en `/productos`

→ Ejecuta `pnpm seed` de nuevo.

### Checkout redirige a MP pero no crea orden

→ Necesitas `MP_ACCESS_TOKEN` en `.env.local`.

---

**¡Listo! Tienes una tienda e-commerce corriendo en local 🚀**

**Next:** Configura Mercado Pago para probar el flujo completo end-to-end.
