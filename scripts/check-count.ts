import { prisma } from "../src/lib/db/prisma";

async function main() {
  const total = await prisma.item.count();
  const bySource = await prisma.item.groupBy({ by: ["source"], _count: { _all: true } });
  const selected = await prisma.item.count({ where: { selected: true } });
  console.log("总条目:", total);
  console.log("入选(selected):", selected);
  console.log("按信源：");
  for (const g of bySource.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  · ${g.source}: ${g._count._all}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
