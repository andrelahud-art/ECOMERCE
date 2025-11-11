import Link from "next/link";

interface Props {
  searchParams: { orderId?: string };
}

export default function CheckoutErrorPage({ searchParams }: Props) {
  const orderId = searchParams.orderId;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Error Header */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center mb-8">
        <div className="mb-4 text-6xl">😔</div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">
          Hubo un problema con tu pago
        </h1>
        <p className="text-zinc-600">
          No se pudo completar la transacción
        </p>
        {orderId && (
          <p className="text-sm text-zinc-500 mt-2">
            Referencia: #{orderId.slice(-8)}
          </p>
        )}
      </div>

      {/* Possible Reasons */}
      <div className="rounded-xl border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">¿Qué pudo haber pasado?</h2>
        <ul className="space-y-3 text-sm text-zinc-700">
          <li className="flex gap-3">
            <span className="text-zinc-400">•</span>
            <span>Fondos insuficientes en tu tarjeta</span>
          </li>
          <li className="flex gap-3">
            <span className="text-zinc-400">•</span>
            <span>Tu banco rechazó la transacción por seguridad</span>
          </li>
          <li className="flex gap-3">
            <span className="text-zinc-400">•</span>
            <span>Datos de la tarjeta incorrectos</span>
          </li>
          <li className="flex gap-3">
            <span className="text-zinc-400">•</span>
            <span>El producto se agotó durante el proceso</span>
          </li>
          <li className="flex gap-3">
            <span className="text-zinc-400">•</span>
            <span>Cancelaste el pago manualmente</span>
          </li>
        </ul>
      </div>

      {/* Next Steps */}
      <div className="rounded-xl border bg-blue-50 border-blue-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">¿Qué puedo hacer?</h2>
        <div className="space-y-3 text-sm text-zinc-700">
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Verifica los datos de tu tarjeta e intenta nuevamente</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Usa otro método de pago (otra tarjeta, SPEI, OXXO)</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Contacta a tu banco para autorizar la compra</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Si el problema persiste, contáctanos para ayudarte</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Link
          href="/productos"
          className="flex-1 text-center rounded-xl bg-black text-white px-6 py-3 font-semibold hover:bg-zinc-800 transition"
        >
          Volver a la tienda
        </Link>
        <Link
          href="/soporte"
          className="flex-1 text-center rounded-xl border border-zinc-300 bg-white px-6 py-3 font-semibold hover:bg-zinc-50 transition"
        >
          Contactar soporte
        </Link>
      </div>

      {/* Support Info */}
      <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 text-center">
        <p className="mb-2">
          <strong>¿Necesitas ayuda?</strong>
        </p>
        <p>
          Escríbenos a{" "}
          <a
            href="mailto:soporte@rematesonlines.mx"
            className="text-blue-600 hover:underline"
          >
            soporte@rematesonlines.mx
          </a>
          <br />
          o llámanos al{" "}
          <a href="tel:5512345678" className="text-blue-600 hover:underline">
            55 1234 5678
          </a>
        </p>
      </div>
    </div>
  );
}
