import { prisma } from "@/server/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

interface Props {
  searchParams: { orderId?: string };
}

export default async function ThankYouPage({ searchParams }: Props) {
  const orderId = searchParams.orderId;

  if (!orderId) {
    redirect("/");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true
            }
          }
        }
      },
      shipment: true
    }
  });

  if (!order) {
    notFound();
  }

  const shipTo = order.shipTo as any;
  const isPaid = order.paymentStatus === "APPROVED";
  const isShipped = order.status === "SHIPPED";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Success Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center mb-8">
        <div className="mb-4 text-6xl">
          {isPaid ? "✅" : "⏳"}
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">
          {isPaid ? "¡Pedido confirmado!" : "Procesando tu pago..."}
        </h1>
        <p className="text-zinc-600">
          Pedido #{order.id.slice(-8)}
        </p>
      </div>

      {/* Order Status Timeline */}
      <div className="rounded-xl border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Estado del pedido</h2>
        <div className="space-y-4">
          {/* Payment */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isPaid ? 'bg-green-500' : 'bg-zinc-200'}`}>
              {isPaid ? '✓' : '1'}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">Pago {isPaid ? 'confirmado' : 'pendiente'}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isPaid ? 'Tu pago ha sido procesado exitosamente' : 'Esperando confirmación de pago'}
              </p>
            </div>
          </div>

          {/* Shipped */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isShipped ? 'bg-green-500' : 'bg-zinc-200'}`}>
              {isShipped ? '✓' : '2'}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">
                {isShipped ? 'Enviado' : 'Preparando envío'}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isShipped ? 'Tu pedido está en camino' : 'Empacaremos tu pedido pronto'}
              </p>
            </div>
          </div>

          {/* Delivered */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-zinc-200">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">Entregado</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {order.shipment?.eta ? `Estimado: ${new Date(order.shipment.eta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}` : 'Pronto'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Info (if shipped) */}
      {order.shipment && (
        <div className="rounded-xl border bg-blue-50 border-blue-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-2xl">📦</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                Información de envío
              </h2>
              <p className="text-sm text-zinc-600">
                Tu pedido ha sido enviado y está en tránsito
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Número de rastreo:</span>
              <span className="font-mono font-semibold">{order.shipment.tracking}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Paquetería:</span>
              <span className="font-medium">{order.shipment.carrier}</span>
            </div>
            {order.shipment.eta && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Entrega estimada:</span>
                <span className="font-medium">
                  {new Date(order.shipment.eta).toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </span>
              </div>
            )}
          </div>

          <a
            href={`https://www.google.com/search?q=${order.shipment.carrier}+${order.shipment.tracking}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full text-center rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition"
          >
            Rastrear mi pedido
          </a>
        </div>
      )}

      {/* Order Summary */}
      <div className="rounded-xl border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Resumen del pedido</h2>

        {/* Items */}
        <div className="space-y-3 mb-4">
          {order.items.map(item => (
            <div key={item.id} className="flex gap-3">
              <div className="flex-shrink-0 w-16 h-16 bg-zinc-100 rounded-lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {item.variant.product.title}
                </h3>
                <p className="text-xs text-zinc-500">
                  {item.variant.product.brand}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Cantidad: {item.qty}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-semibold text-sm">
                  ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">Subtotal:</span>
            <span className="font-medium">${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">Envío:</span>
            <span className="font-medium">${Number(order.shipping).toFixed(2)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento:</span>
              <span>-${Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t">
            <span>Total:</span>
            <span>${Number(order.grandTotal).toFixed(2)} MXN</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="rounded-xl border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Dirección de envío</h2>
        <div className="text-sm text-zinc-700 space-y-1">
          <p className="font-medium">{shipTo.name || 'Cliente'}</p>
          <p>{shipTo.street1 || 'Calle ejemplo 123'}</p>
          {shipTo.street2 && <p>{shipTo.street2}</p>}
          <p>
            {shipTo.city || 'Ciudad de México'}, {shipTo.state || 'CDMX'} {shipTo.zip || '03100'}
          </p>
          <p className="text-zinc-500">{order.email}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/productos"
          className="flex-1 text-center rounded-xl bg-black text-white px-6 py-3 font-semibold hover:bg-zinc-800 transition"
        >
          Seguir comprando
        </Link>
        <Link
          href="/soporte"
          className="flex-1 text-center rounded-xl border border-zinc-300 bg-white px-6 py-3 font-semibold hover:bg-zinc-50 transition"
        >
          ¿Necesitas ayuda?
        </Link>
      </div>

      {/* Info Note */}
      <div className="mt-8 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
        <p>
          📧 Hemos enviado un email de confirmación a <strong>{order.email}</strong> con
          todos los detalles de tu pedido.
        </p>
        {isShipped && (
          <p className="mt-2">
            📱 Recibirás actualizaciones por email cuando tu paquete esté en tránsito y sea entregado.
          </p>
        )}
      </div>
    </div>
  );
}
