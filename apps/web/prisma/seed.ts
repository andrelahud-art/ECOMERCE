import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const skus = Array.from({ length: 30 }).map((_, i) => ({
  slug: `producto-${i+1}`,
  title: `Producto Electrónico ${i+1}`,
  brand: i % 2 ? "Auratech" : "Voltix",
  model: `MX-${1000 + i}`,
  condition: "OPENBOX" as const,
  grade: (["A","A","B","C"] as const)[i % 4],
  warrantyDays: 30,
  specs: { bt: "5.3", battery: `${24 + (i%6)}h`, port: "USB-C" },
  variant: {
    sku: `SKU-${(i+1).toString().padStart(4,"0")}`,
    attributes: { color: ["Black","White","Blue"][i%3] }
  },
  pricing: { list: 999 + i*10, sale: 799 + i*10, floorMin: 749 + i*10 },
  inventory: { qty: 10 + (i%7), cost: 499 + i*5 }
}));

async function main() {
  for (const s of skus) {
    await db.product.create({
      data: {
        slug: s.slug,
        title: s.title,
        brand: s.brand,
        model: s.model,
        condition: "OPENBOX",
        grade: s.grade as any,
        warrantyDays: s.warrantyDays,
        specs: s.specs as any,
        variants: {
          create: [{
            sku: s.variant.sku,
            attributes: s.variant.attributes as any,
            inventory: { create: { qtyAvailable: s.inventory.qty, cost: s.inventory.cost } },
            prices: { create: { list: s.pricing.list, sale: s.pricing.sale, floorMin: s.pricing.floorMin } }
          }]
        }
      }
    });
  }
  console.log("Seed OK: 30 SKUs creados");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
