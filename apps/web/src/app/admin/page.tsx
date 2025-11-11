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
