import { SOURCES } from "../src/lib/sources";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const ids = new Set(SOURCES.map((s) => s.id));
  for (const s of SOURCES) {
    await prisma.source.upsert({
      where: { id: s.id },
      create: { ...s },
      update: {
        name: s.name,
        type: s.type,
        category: s.category,
        url: s.url,
        enabled: s.enabled,
        fetchInterval: s.fetchInterval,
      },
    });
  }
  const existing = await prisma.source.findMany({ select: { id: true } });
  const orphans = existing.map((e) => e.id).filter((id) => !ids.has(id));
  if (orphans.length) {
    await prisma.source.deleteMany({ where: { id: { in: orphans } } });
  }
  console.log(`✓ 已同步 ${SOURCES.length} 个信源；清理孤立源：${orphans.join(", ") || "(无)"}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
