import {
  getSources,
  getSettings,
  getExistingForIngest,
  createItem,
  updateItem,
  touchSource,
  recordTokenUsage,
} from "./db/repository";
import { scoreItem } from "./llm";
import { interpretItem } from "./interpret";
import { FETCHERS, fetchYoutube, fetchTwitter } from "./fetchers";
import type { Item } from "./types";

export interface IngestSourceStat {
  fetched: number;
  created: number;
  skipped: number;
  throttled: number; // 因 fetchInterval 未到周期而跳过的次数
  ok: boolean;
  error?: string;
}

export interface IngestResult {
  ok: boolean;
  totalFetched: number;
  totalCreated: number;
  totalSkipped: number;
  totalThrottled: number;
  startedAt: string;
  finishedAt: string;
  bySource: Record<string, IngestSourceStat>;
  errors: string[];
}

  // 单个信源单次采集条数上限，避免某个 RSS 历史过大撑爆存储。
const MAX_PER_SOURCE = 25;

// 每次采集为 paper/project 生成解读的条数上限，控制 LLM 调用与成本。
const INTERPRET_CAP = 12;

// 运行一次采集：遍历已启用信源 → 抓取 → 去重 → LLM/启发式打分 → 入库。
// 默认对每条都跑 scoreItem（无 key 自动降级到启发式，不产生费用）。
export async function runIngestion(opts?: {
  sourceIds?: string[];
  skipScore?: boolean;
  force?: boolean; // 绕过 fetchInterval 节流（后台手动「立即抓取」用）
}): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const result: IngestResult = {
    ok: true,
    totalFetched: 0,
    totalCreated: 0,
    totalSkipped: 0,
    totalThrottled: 0,
    startedAt,
    finishedAt: startedAt,
    bySource: {},
    errors: [],
  };

  const sources = (await getSources()).filter(
    (s) => s.enabled && (opts?.sourceIds ? opts.sourceIds.includes(s.id) : true),
  );
  const { urls: existingUrls, titles: existingTitles } = await getExistingForIngest();
  const urlSet = new Set(existingUrls);
  const titleSet = new Set(existingTitles);
  const settings = await getSettings();

  // 本次新入选、待生成解读的 paper/project 候选
  const itemsToInterpret: Item[] = [];

  // 按供应商累计本次采集产生的 token 消耗
  const usageAcc: Record<string, { promptTokens: number; completionTokens: number; totalTokens: number; items: number }> = {};

  for (const src of sources) {
    const stat: IngestSourceStat = { fetched: 0, created: 0, skipped: 0, throttled: 0, ok: true };
    result.bySource[src.id] = stat;
    console.log(`[ingest] start src=${src.id} type=${src.type} url=${src.url} force=${!!opts?.force}`);

    // fetchInterval 节流：默认开启；显式指定 sourceIds / force 时跳过（后台手动抓取应强制执行）。
    // 这样单次每小时 cron 即可自动区分——新闻源(3600s)每小时重抓，论文/GitHub(86400s)每 24h 才抓一次。
    if (!opts?.force && !opts?.sourceIds) {
      const intervalMs = (src.fetchInterval || 86400) * 1000;
      const last = src.lastFetch ? new Date(src.lastFetch).getTime() : 0;
      if (last && Date.now() - last < intervalMs) {
        stat.throttled++;
        result.totalThrottled++;
        console.log(`[ingest] skip(throttle) src=${src.id} lastFetch=${src.lastFetch ?? "never"} interval=${(src.fetchInterval || 86400)}s`);
        continue;
      }
    }

    const fetcher = src.type === "youtube" ? fetchYoutube : src.type === "twitter" ? fetchTwitter : FETCHERS[src.id];
    if (!fetcher) continue;
    try {
      const raws = await fetcher(src);
      console.log(`[ingest] fetched src=${src.id} rawCount=${raws.length}`);
      for (const r of raws.slice(0, MAX_PER_SOURCE)) {
        stat.fetched++;
        result.totalFetched++;
        if (urlSet.has(r.url) || titleSet.has(r.title.toLowerCase())) {
          console.log(`[ingest] skip(dup) src=${src.id} title="${r.title.slice(0, 60)}"`);
          stat.skipped++;
          result.totalSkipped++;
          continue;
        }
        const scored: { score: number; ai?: boolean; summary?: string; title_zh?: string; tags?: string[]; usage?: any } =
          opts?.skipScore
            ? { score: 50, ai: undefined }
            : await scoreItem(r);
        if (scored.usage) {
          const acc =
            (usageAcc[scored.usage.provider] ||= {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              items: 0,
            });
          acc.promptTokens += scored.usage.promptTokens;
          acc.completionTokens += scored.usage.completionTokens;
          acc.totalTokens += scored.usage.totalTokens;
          acc.items++;
        }
        // 内容级 AI 相关性把关 + 预筛源入选保底：
        //  - ai===false：明确非 AI 内容，直接不入选（即便质量再高）
        //  - 预筛 AI 信源（arXiv 分类 / GitHub topic）：L1 已保证 AI 相关性，给入选保底，不被 55 分卡掉
        //  - 其它信源：按精选分阈值入选
        const isPreVettedAi = src.id === "arxiv-ai" || src.id === "github-trending";
        let selected: boolean;
        if (scored.ai === false) selected = false;
        else if (isPreVettedAi) selected = true;
        else selected = scored.score >= settings.autoSelectThreshold;
        const item = await createItem({
          ...r,
          score: scored.score,
          summary: r.summary || scored.summary || "",
          title_zh: r.title_zh || scored.title_zh,
          tags: r.tags && r.tags.length ? r.tags : scored.tags || [],
          selected,
        });
        console.log(
          `[ingest] create src=${src.id} score=${scored.score} ai=${scored.ai ?? "-"} selected=${selected} title="${r.title.slice(0, 50)}"`,
        );
        urlSet.add(item.url);
        titleSet.add(item.title.toLowerCase());
        stat.created++;
        result.totalCreated++;
        // 候选解读：新入选的论文 / 代码项目，且尚未有解读
        if (selected && (item.type === "paper" || item.type === "project") && !item.interpretation) {
          itemsToInterpret.push(item);
        }
      }
      await touchSource(src.id, new Date().toISOString());
    } catch (e) {
      const detail = e instanceof Error ? (e.stack || e.message) : String(e);
      stat.ok = false;
      stat.error = String(e instanceof Error ? e.message : e);
      result.errors.push(`${src.id}: ${stat.error}`);
      result.ok = false;
      console.error(`[ingest] ERROR src=${src.id}: ${stat.error}\n${detail}`);
    }
  }

  result.finishedAt = new Date().toISOString();
  console.log(
    `[ingest] DONE ok=${result.ok} fetched=${result.totalFetched} created=${result.totalCreated} ` +
      `skipped=${result.totalSkipped} throttled=${result.totalThrottled} errors=${result.errors.length} ` +
      `bySource=${JSON.stringify(result.bySource)}`,
  );

  // 解读步：对本次新入选的 paper/project 生成结构化解读（限量，避免一次性过多 LLM 调用）。
  // 论文直接用已抓 abstract；代码项目额外拉 README 增强素材。失败/无结果不阻塞主流程。
  let interpretCreated = 0;
  let interpretFailed = 0;
  const toInterpret = itemsToInterpret.slice(0, INTERPRET_CAP);
  for (const it of toInterpret) {
    try {
      const interp = await interpretItem(it);
      if (!interp) {
        console.log(`[ingest] interpret skip(no result) id=${it.id} type=${it.type}`);
        continue;
      }
      await updateItem(it.id, { interpretation: interp } as Partial<Item>);
      interpretCreated++;
      console.log(`[ingest] interpret created id=${it.id} kind=${interp.kind} provider=${interp.provider} summary="${interp.summary.slice(0, 40)}"`);
    } catch (e) {
      interpretFailed++;
      console.error(`[ingest] interpret ERROR id=${it.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (toInterpret.length > 0)
    console.log(
      `[ingest] interpret DONE created=${interpretCreated} failed=${interpretFailed} ` +
        `candidates=${itemsToInterpret.length} ran=${toInterpret.length} cap=${INTERPRET_CAP}`,
    );

  // 采集产生的 token 消耗按供应商汇总入库（供后台统计）
  const today = new Date().toISOString().slice(0, 10);
  for (const [provider, u] of Object.entries(usageAcc)) {
    await recordTokenUsage({ date: today, provider, ...u });
  }

  return result;
}
