// 存量回填：为 DB 中已精选、但尚无解读的 paper/project 生成结构化解读并写回。
// - 论文直接用已存 abstract；代码项目额外拉 GitHub README 增强素材。
// - 复用 interpret.ts（走与采集相同的 LLM 供应商路由与降级策略）。
// - 单次上限 50 条，避免一次性过多调用；可分多次运行直到 candidates=0。
//
// 用法：
//   tsx scripts/backfill-interpret.ts                 # 回填最多 50 条
//   tsx scripts/backfill-interpret.ts --limit=20      # 仅前 20 条
import { PrismaClient } from "@prisma/client";
import { interpretItem } from "../src/lib/interpret";
import { updateItem, getItems } from "../src/lib/db/repository";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const limit = Math.min(50, Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1]) || 50);

async function main() {
  const papers = (await getItems({ type: "paper", hasInterpretation: false, take: limit })).items;
  const projects = (await getItems({ type: "project", hasInterpretation: false, take: limit })).items;
  const targets = [...papers, ...projects].slice(0, limit);
  console.log(`[backfill-interpret] candidates=${targets.length}`);

  let created = 0;
  for (const it of targets) {
    try {
      const interp = await interpretItem(it);
      if (!interp) {
        console.log(`  skip(no result) id=${it.id} type=${it.type}`);
        continue;
      }
      await updateItem(it.id, { interpretation: interp });
      created++;
      console.log(`  created id=${it.id} kind=${interp.kind} provider=${interp.provider}`);
    } catch (e) {
      console.error(`  ERROR id=${it.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`[backfill-interpret] DONE created=${created} candidates=${targets.length}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
