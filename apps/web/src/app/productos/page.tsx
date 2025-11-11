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
