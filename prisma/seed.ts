// 种子数据灌入：信源 + 站点设置 + 初始条目
// 运行：npx prisma db seed
import { SOURCES } from "../src/lib/sources";
import { ITEMS } from "../src/lib/db/seed";
import {
  upsertSource,
  upsertSettings,
  defaultSettings,
  upsertItemExternal,
} from "../src/lib/db/repository";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  console.log("→ 写入站点设置 ...");
  await upsertSettings(defaultSettings());

  console.log(`→ 写入 ${SOURCES.length} 个信源 ...`);
  for (const s of SOURCES) await upsertSource(s);

  console.log(`→ 写入 ${ITEMS.length} 条初始内容 ...`);
  let n = 0;
  for (const it of ITEMS) {
    await upsertItemExternal(it);
    n++;
  }
  console.log(`✓ 种子完成：${n} 条内容 / ${SOURCES.length} 个信源`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
