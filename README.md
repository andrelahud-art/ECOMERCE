# RematesOnlines.mx – Phase 1 Scaffold

## Arranque
```bash
pnpm i
cp apps/web/.env.example apps/web/.env.local  # completa valores
pnpm db:push && pnpm --filter @ro/web seed
pnpm dev
# http://localhost:3000 → /productos → PDP → Comprar ahora
```

## Webhook Mercado Pago
Configura en MP:
```
https://<tu-ngrok-o-vercel>/api/webhooks/mp?secret=<MP_WEBHOOK_SECRET>
```

## Siguientes pasos
- Reserva/decremento de stock atómico al aprobar pago.
- Integrar Skydropx/99minutos para compra de guía tras `PAID`.
- Emails transaccionales con Resend.
- Facetas/Algolia en PLP y RBAC para /admin.
