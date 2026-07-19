// 社媒热点分析（内部用）：输入 X / 微博 内部信源条目，输出
// 关键词热度、信源分布、每日量、以及「选题建议」。
// 纯 TS 实现，不依赖原生分词库：
//   - 微博 #话题# / X #hashtag# 显式话题标签（最高信号）
//   - @提及（实体 / 账号）
//   - 中文 CJK n-gram（2~4 字）+ 英文词，配合停用词与冗余剔除得到关键词
// 热度分 = 词频 + 近 2 天频次加权，兼顾「总量」与「当下爆发」。
import type { Item } from "./types";
import { SOURCES } from "./sources";

const CJK_RE = /[一-鿿㐀-䶿]/;
function isCJK(c: string): boolean {
  return CJK_RE.test(c);
}

// 仅覆盖高频功能词 / 过泛词；保留「大模型 / 开源 / 微调」等有信息量的组合词。
const STOPWORDS = new Set([
  "的", "了", "是", "在", "我", "你", "他", "她", "它", "我们", "你们", "他们", "她们",
  "这个", "那个", "一个", "这些", "那些", "这样", "那样", "就是", "因为", "所以", "但是",
  "如果", "对于", "关于", "通过", "使用", "进行", "一下", "觉得", "感觉", "看到", "已经",
  "现在", "今天", "昨天", "明天", "没有", "不是", "还是", "可以", "怎么", "什么", "为什么",
  "如何", "需要", "一些", "这种", "那种", "以及", "并且", "当然", "其实", "完全", "非常",
  "比较", "有点", "很多", "大家", "知道", "认为", "表示", "发布", "推出", "上线", "支持",
  "公司", "用户", "产品", "能力", "系统", "技术", "团队", "时候", "问题", "方式", "数据",
  "效果", "表现", "方面", "目前", "未来", "开始", "继续", "计划", "想要", "希望", "相信",
  "真的", "应该", "可能", "这", "那", "也", "都", "很", "就", "还", "又", "不", "没", "别",
  "把", "被", "让", "给", "对", "和", "与", "或", "及", "等", "地", "得", "着", "过",
  "啊", "吧", "呢", "吗", "哦", "嗯", "哈哈", "自己",
]);

interface TermRecord {
  term: string;
  count: number;
  recentCount: number; // 近 2 天
  sources: Set<string>;
  items: Item[]; // 关联条目（最多若干，用于选题取样）
}

export interface TopicSuggestion {
  keyword: string;
  frequency: number;
  score: number;
  accounts: { name: string; url: string }[];
  sampleItems: { title: string; url: string; source: string; publishedAt: string }[];
  suggestedAngle: string; // 自动生成的选题角度建议
}

export interface SocialAnalysis {
  generatedAt: string;
  windowDays: number;
  itemCount: number;
  sourceBreakdown: { source: string; type: string; count: number }[];
  dailyVolume: { date: string; count: number }[];
  topKeywords: { term: string; count: number; recentCount: number; score: number; sources: string[] }[];
  topics: TopicSuggestion[];
  brief: string;
}

const MAX_SAMPLE = 5;
const sourceMeta = new Map(SOURCES.map((s) => [s.name, s]));

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function extractHashtags(text: string): string[] {
  const out: string[] = [];
  const wb = text.match(/#([^#\n]{1,40})#/g); // 微博 #话题#
  if (wb) for (const m of wb) { const t = m.slice(1, -1).trim(); if (t) out.push(t); }
  const x = text.match(/#([A-Za-z0-9_]{1,40})/g); // X #hashtag
  if (x) for (const m of x) { const t = m.slice(1).trim(); if (t) out.push(t); }
  return out;
}
function extractMentions(text: string): string[] {
  const m = text.match(/@([A-Za-z0-9_一-鿿]{1,40})/g);
  if (!m) return [];
  return m.map((s) => s.slice(1).trim()).filter(Boolean);
}
function cjkRuns(text: string): string[] {
  const runs: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (isCJK(ch)) cur += ch;
    else { if (cur.length >= 2) runs.push(cur); cur = ""; }
  }
  if (cur.length >= 2) runs.push(cur);
  return runs;
}
function grams(run: string, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= run.length; i++) out.push(run.slice(i, i + n));
  return out;
}

export function analyzeSocial(
  items: Item[],
  opts: { windowDays?: number } = {},
): SocialAnalysis {
  const windowDays = opts.windowDays ?? 7;
  const now = Date.now();
  const recentMs = 2 * 86_400_000;

  // 1) 词条聚合
  const termMap = new Map<string, TermRecord>();
  const ensure = (t: string): TermRecord => {
    let r = termMap.get(t);
    if (!r) { r = { term: t, count: 0, recentCount: 0, sources: new Set(), items: [] }; termMap.set(t, r); }
    return r;
  };

  for (const it of items) {
    const text = stripTags(`${it.title} ${it.title_zh ?? ""} ${it.summary ?? ""}`);
    const tags = extractHashtags(text);
    const mentions = extractMentions(text);
    const runs = cjkRuns(text);
    const asciiWords = (text.match(/[A-Za-z][A-Za-z0-9+#.\-]{2,}/g) || []).map((w) => w.toLowerCase());

    const candidates = new Set<string>();
    for (const t of tags) candidates.add(t);
    for (const m of mentions) candidates.add("@" + m);
    for (const w of asciiWords) candidates.add(w);
    for (const run of runs) for (const n of [2, 3, 4]) for (const g of grams(run, n)) candidates.add(g);

    const ts = new Date(it.publishedAt).getTime();
    const isRecent = now - ts <= recentMs;

    for (const c of candidates) {
      if (STOPWORDS.has(c)) continue;
      if (c.length === 1) continue; // 单字（含单字母）噪声太大
      const r = ensure(c);
      r.count++;
      if (isRecent) r.recentCount++;
      r.sources.add(it.source);
      if (r.items.length < MAX_SAMPLE) r.items.push(it);
    }
  }

  // 2) 冗余清理：长词包含短词且频次接近时，丢弃短词
  const all = [...termMap.values()].sort((a, b) => b.count - a.count || b.term.length - a.term.length);
  const kept: TermRecord[] = [];
  for (const r of all) {
    const dominated = kept.some((k) => k.term.includes(r.term) && k.count >= r.count * 0.6);
    if (dominated) continue;
    kept.push(r);
  }

  // 3) 热度分（词频 + 近因）
  const scored = kept
    .map((r) => ({ r, score: Math.round((r.count + r.recentCount * 0.6) * 100) / 100 }))
    .sort((a, b) => b.score - a.score);

  const topKeywords = scored.slice(0, 25).map(({ r, score }) => ({
    term: r.term,
    count: r.count,
    recentCount: r.recentCount,
    score,
    sources: [...r.sources].slice(0, 8),
  }));

  // 4) 选题建议（头部话题）
  const topics: TopicSuggestion[] = scored.slice(0, 15).map(({ r, score }) => {
    const accounts = [...r.sources].map((name) => {
      const meta = sourceMeta.get(name);
      const url = meta?.url
        ? meta.url.startsWith("http")
          ? meta.url
          : `https://rsshub.hackcv.com/${meta.url}`
        : "";
      return { name, url };
    });
    const sampleItems = r.items
      .slice()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, MAX_SAMPLE)
      .map((i) => ({ title: i.title, url: i.url, source: i.source, publishedAt: i.publishedAt }));
    const accountNames = accounts.map((a) => a.name).join("、");
    const suggestedAngle =
      `「${r.term}」近期被 ${accountNames || "多个账号"} 提及（共 ${r.count} 次，近 2 天 ${r.recentCount} 次）。` +
      `建议围绕其最新进展、应用实践或争议点展开选题，例如：「${r.term} 是什么 / 为什么火 / 怎么用 / 与同类对比」。`;
    return { keyword: r.term, frequency: r.count, score, accounts, sampleItems, suggestedAngle };
  });

  // 5) 信源分布 + 每日量
  const srcCount = new Map<string, number>();
  const dayCount = new Map<string, number>();
  for (const it of items) {
    srcCount.set(it.source, (srcCount.get(it.source) ?? 0) + 1);
    const d = it.publishedAt.slice(0, 10);
    dayCount.set(d, (dayCount.get(d) ?? 0) + 1);
  }
  const sourceBreakdown = [...srcCount.entries()]
    .map(([source, count]) => ({ source, type: sourceMeta.get(source)?.type ?? "unknown", count }))
    .sort((a, b) => b.count - a.count);
  const dailyVolume = [...dayCount.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const top3 = topKeywords.slice(0, 3).map((k) => k.term).join("、");
  const brief = `过去 ${windowDays} 天，X / 微博内部信源共 ${items.length} 条，热点集中在：${top3 || "（数据不足）"}。`;

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    itemCount: items.length,
    sourceBreakdown,
    dailyVolume,
    topKeywords,
    topics,
    brief,
  };
}
