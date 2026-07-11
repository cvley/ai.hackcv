import { runIngestion } from "../src/lib/ingest";

async function main() {
  console.log("→ 开始真实采集（去重 + 启发式打分，无 LLM key 不调模型）...");
  const r = await runIngestion();
  console.log(
    `\n=== 采集完成 ===\n` +
      `ok=${r.ok}  总抓取=${r.totalFetched}  新建=${r.totalCreated}  跳过=${r.totalSkipped}\n` +
      `各源：\n` +
      Object.entries(r.bySource)
        .map(([k, v]) => `  · ${k}: 抓取${v.fetched}/新建${v.created}/跳过${v.skipped}${v.ok ? "" : " ✗ " + (v.error || "")}`)
        .join("\n"),
  );
  if (r.errors.length) console.log("\n错误：\n" + r.errors.map((e) => "  - " + e).join("\n"));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
