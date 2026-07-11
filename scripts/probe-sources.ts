import { SOURCES } from "../src/lib/sources";
import { FETCHERS } from "../src/lib/fetchers";

async function main() {
  console.log(`=== 信源探针：共 ${SOURCES.length} 个 ===\n`);
  for (const src of SOURCES) {
    const fetcher = FETCHERS[src.id];
    if (!fetcher) {
      console.log(`✗ ${src.id} (${src.name}) — 无对应 fetcher，跳过`);
      continue;
    }
    const t0 = Date.now();
    try {
      const items = await fetcher(src);
      const ms = Date.now() - t0;
      const sample = items.slice(0, 2)
        .map((i) => `    · ${i.title?.slice(0, 60)} [${i.category}] ${i.url?.slice(0, 50)}`)
        .join("\n");
      console.log(
        `✓ ${src.id} (${src.type}) — 返回 ${items.length} 条 (${ms}ms)\n${sample || "    (无样例)"}`,
      );
    } catch (e) {
      const ms = Date.now() - t0;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${src.id} (${src.type}) — 失败 (${ms}ms): ${msg}`);
    }
    console.log("");
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("探针异常：", e);
  process.exit(1);
});
