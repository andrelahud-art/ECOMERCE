import { prisma } from "@/server/db";
import { notFound } from "next/navigation";

export default async function PDP({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
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
