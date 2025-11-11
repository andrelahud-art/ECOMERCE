import { prisma } from "@/server/db";
import Link from "next/link";

export default async function Admin() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
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

  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.paymentStatus === "APPROVED").length,
    shipped: orders.filter(o => o.status === "SHIPPED").length,
    revenue: orders
      .filter(o => o.paymentStatus === "APPROVED")
      .reduce((sum, o) => sum + Number(o.grandTotal), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-zinc-600 mt-1">Gestiona pedidos y operaciones</p>
        </div>
        <Link
          href="/"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          ← Volver a la tienda
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-5">
          <div className="text-2xl font-bold text-zinc-900">{stats.total}</div>
          <div className="text-sm text-zinc-600 mt-1">Total pedidos</div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          <div className="text-sm text-zinc-600 mt-1">Pagados</div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <div className="text-2xl font-bold text-blue-600">{stats.shipped}</div>
          <div className="text-sm text-zinc-600 mt-1">Enviados</div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <div className="text-2xl font-bold text-zinc-900">
            ${stats.revenue.toFixed(0)}
          </div>
          <div className="text-sm text-zinc-600 mt-1">Ingresos MXN</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Pedidos Recientes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-zinc-700">ID</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-700">Cliente</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-700">Items</th>
                <th className="text-center px-5 py-3 font-medium text-zinc-700">Estado</th>
                <th className="text-center px-5 py-3 font-medium text-zinc-700">Pago</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-700">Tracking</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-700">Total</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-700">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const statusColors = {
                  DRAFT: "bg-zinc-100 text-zinc-700",
                  PAID: "bg-green-100 text-green-700",
                  PICKING: "bg-blue-100 text-blue-700",
                  SHIPPED: "bg-blue-100 text-blue-700",
                  DELIVERED: "bg-green-100 text-green-700",
                  RETURNED: "bg-red-100 text-red-700"
                };

                const paymentColors = {
                  PENDING: "bg-yellow-100 text-yellow-700",
                  APPROVED: "bg-green-100 text-green-700",
                  REJECTED: "bg-red-100 text-red-700",
                  REFUNDED: "bg-zinc-100 text-zinc-700"
                };

                return (
                  <tr key={order.id} className="border-b hover:bg-zinc-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/gracias?orderId=${order.id}`}
                        className="font-mono text-xs text-blue-600 hover:underline"
                      >
                        {order.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-zinc-900 font-medium">{order.email}</div>
                      {order.phone && (
                        <div className="text-xs text-zinc-500">{order.phone}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-zinc-600">
                        {order.items.length} item(s)
                      </div>
                      <div className="text-xs text-zinc-400 max-w-xs truncate">
                        {order.items.map(i => i.variant.product.title).join(", ")}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${paymentColors[order.paymentStatus]}`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {order.shipment ? (
                        <div>
                          <div className="font-mono text-xs text-zinc-900">
                            {order.shipment.tracking}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {order.shipment.carrier}
                          </div>
                          {order.shipment.labelUrl && (
                            <a
                              href={order.shipment.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Ver guía
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-semibold text-zinc-900">
                        ${Number(order.grandTotal).toFixed(2)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        MXN
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-zinc-600">
                      {new Date(order.createdAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            <div className="text-4xl mb-3">📦</div>
            <p>No hay pedidos aún</p>
            <p className="text-sm mt-1">Los pedidos aparecerán aquí cuando se creen</p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-sm text-zinc-500 text-center">
        Mostrando los últimos 100 pedidos
      </div>
    </div>
  );
}
