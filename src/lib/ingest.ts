import {
  getSources,
  getSettings,
  getExistingForIngest,
  createItem,
  touchSource,
  recordTokenUsage,
} from "./db/repository";
import { scoreItem } from "./llm";
import { FETCHERS } from "./fetchers";
import type { Item } from "./types";

export interface IngestSourceStat {
  fetched: number;
  created: number;
  skipped: number;
  ok: boolean;
  error?: string;
}

export interface IngestResult {
  ok: boolean;
  totalFetched: number;
  totalCreated: number;
  totalSkipped: number;
  startedAt: string;
  finishedAt: string;
  bySource: Record<string, IngestSourceStat>;
  errors: string[];
}

// 单个信源单次采集条数上限，避免某个 RSS 历史过大撑爆存储。
const MAX_PER_SOURCE = 25;

// 运行一次采集：遍历已启用信源 → 抓取 → 去重 → LLM/启发式打分 → 入库。
// 默认对每条都跑 scoreItem（无 key 自动降级到启发式，不产生费用）。
export async function runIngestion(opts?: {
  sourceIds?: string[];
  skipScore?: boolean;
}): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const result: IngestResult = {
    ok: true,
    totalFetched: 0,
    totalCreated: 0,
    totalSkipped: 0,
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

  // 按供应商累计本次采集产生的 token 消耗
  const usageAcc: Record<string, { promptTokens: number; completionTokens: number; totalTokens: number; items: number }> = {};

  for (const src of sources) {
    const stat: IngestSourceStat = { fetched: 0, created: 0, skipped: 0, ok: true };
    result.bySource[src.id] = stat;
    const fetcher = FETCHERS[src.id];
    if (!fetcher) continue;
    try {
      const raws = await fetcher(src);
      for (const r of raws.slice(0, MAX_PER_SOURCE)) {
        stat.fetched++;
        result.totalFetched++;
        if (urlSet.has(r.url) || titleSet.has(r.title.toLowerCase())) {
          stat.skipped++;
          result.totalSkipped++;
          continue;
        }
        const scored = opts?.skipScore
          ? { score: 50 }
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
        const item = await createItem({
          ...r,
          score: scored.score,
          summary: r.summary || scored.summary || "",
          title_zh: r.title_zh || scored.title_zh,
          tags: r.tags && r.tags.length ? r.tags : scored.tags || [],
          selected: scored.score >= settings.autoSelectThreshold,
        });
        urlSet.add(item.url);
        titleSet.add(item.title.toLowerCase());
        stat.created++;
        result.totalCreated++;
      }
      await touchSource(src.id, new Date().toISOString());
    } catch (e) {
      stat.ok = false;
      stat.error = String(e instanceof Error ? e.message : e);
      result.errors.push(`${src.id}: ${stat.error}`);
      result.ok = false;
    }
  }

  result.finishedAt = new Date().toISOString();

  // 采集产生的 token 消耗按供应商汇总入库（供后台统计）
  const today = new Date().toISOString().slice(0, 10);
  for (const [provider, u] of Object.entries(usageAcc)) {
    await recordTokenUsage({ date: today, provider, ...u });
  }

  return result;
}
