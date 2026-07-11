// 存量重打分：把 DB 中已存在的条目批量用 LLM（scoreItem）重新打分并写回。
// - 无 LLM key 或某条全部 provider 失败时，scoreItem 降级到启发式（无 provider 标记），该条跳过写回、保留原分。
// - 仅当真正拿到 LLM 结果（res.provider 存在）才更新 score/summary/title_zh/tags/recommendation。
// - 按供应商累计 token 用量，循环后 recordTokenUsage 落库（后台「Token 消耗统计」可见）。
//
// 用法：
//   tsx scripts/rescore.ts                       # 全量重跑（并发 3，调用 LLM 重新打分+写回）
//   tsx scripts/rescore.ts --limit=5            # 仅前 5 条（验证用）
//   tsx scripts/rescore.ts --concurrency=5      # 调整并发
//   tsx scripts/rescore.ts --reselect           # 不调 LLM：仅按现有 score 对照阈值重算 selected（修复 score<阈值仍是精选 的脏数据）
import { PrismaClient } from "@prisma/client";
import { scoreItem } from "../src/lib/llm";
import { updateItem, recordTokenUsage, getSettings } from "../src/lib/db/repository";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const concurrency = Math.max(1, Number(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1]) || 3);
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1]) || 0;
const reselect = args.includes("--reselect");

async function main() {
  const rows = await prisma.item.findMany({ orderBy: { publishedAt: "desc" } });
  const items = limit > 0 ? rows.slice(0, limit) : rows;
  console.log(`待重打分条目：${items.length}（共 ${rows.length} 条），并发 ${concurrency}`);

  // ---- 仅重算精选（reselect）：不调 LLM、不产生 token，按现有 score 对照阈值翻转 selected ----
  if (reselect) {
    const threshold = (await getSettings()).autoSelectThreshold;
    console.log(`\n[reselect] 阈值=${threshold}，按现有 score 重算 selected（不调用 LLM、不计费）`);
    let changed = 0, toOn = 0, toOff = 0;
    for (const row of items) {
      const score = row.score ?? 0;
      const shouldSelect = score >= threshold;
      if (shouldSelect !== row.selected) {
        // 必须带上 score，否则 updateItem 内部会触发启发式重算覆盖掉已有 LLM 分数
        await updateItem(row.id, { selected: shouldSelect, score: row.score ?? 0 } as any);
        changed++;
        if (shouldSelect) toOn++;
        else toOff++;
        console.log(`  ${row.id.slice(0, 8)} score=${score} selected ${row.selected}→${shouldSelect}  ${(row.title || "").slice(0, 24)}`);
      }
    }
    console.log(`\n=== reselect 完成 ===  变更 ${changed} 条（→入选 ${toOn}，→移出 ${toOff}）`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const usageAcc: Record<string, { promptTokens: number; completionTokens: number; totalTokens: number; items: number }> = {};
  let done = 0, ok = 0, skipped = 0, failed = 0;
  const queue = items.slice();

  async function worker() {
    while (queue.length) {
      const row = queue.shift()!;
      const n = ++done;
      try {
        const res = await scoreItem({ title: row.title, summary: row.summary });
        if (!res.provider) {
          skipped++;
          console.log(`  [${n}/${items.length}] SKIP(启发式降级) score=${res.score} ${(row.title || "").slice(0, 24)}`);
          continue;
        }
        await updateItem(row.id, {
          score: res.score,
          summary: res.summary ?? row.summary,
          title_zh: res.title_zh,
          recommendation: res.summary ?? row.summary,
          tags: res.tags && res.tags.length ? res.tags : (row.tags as string[]),
        });
        if (res.usage) {
          const u = (usageAcc[res.provider] ||= { promptTokens: 0, completionTokens: 0, totalTokens: 0, items: 0 });
          u.promptTokens += res.usage.promptTokens;
          u.completionTokens += res.usage.completionTokens;
          u.totalTokens += res.usage.totalTokens;
          u.items += 1;
        }
        ok++;
        console.log(`  [${n}/${items.length}] score=${res.score} provider=${res.provider} ${(row.title || "").slice(0, 24)}`);
      } catch (e) {
        failed++;
        console.log(`  [${n}/${items.length}] ERROR ${String(e).slice(0, 80)} ${(row.title || "").slice(0, 24)}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  for (const [provider, u] of Object.entries(usageAcc)) {
    await recordTokenUsage({ date: today, provider, ...u });
  }

  console.log(`\n=== 完成 ===`);
  console.log(`  写回：${ok}  跳过(启发式)：${skipped}  失败：${failed}`);
  if (Object.keys(usageAcc).length) {
    console.log(`  Token 消耗（按供应商，已记录到 ${today}）：`);
    for (const [p, u] of Object.entries(usageAcc))
      console.log(`    ${p}: ${u.totalTokens} tokens（${u.items} 条）`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
