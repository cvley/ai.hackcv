// 数据访问层（正式持久化）——
// 全部基于 Prisma + PostgreSQL，取代原先的 JSON 文件存储（lib/db/store.ts）。
// 对外函数签名与旧版保持一致，但均为 async（需 await）。
import { Prisma } from "@prisma/client";
import type {
  Item,
  ItemType,
  Daily,
  Section,
  Category,
  Source,
  SiteSettings,
  ItemsResponse,
  SearchResponse,
  TagInfo,
  Interpretation,
} from "../types";
import { CATEGORIES } from "./seed";
import { SOURCES } from "../sources";
import { prisma } from "./prisma";
import { hotness } from "../scoring";
import { computeScore } from "../scoring";
import { SITE } from "../config";

// ============ 行 ↔ 领域对象映射 ============

function rowToItem(r: any): Item {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    title_zh: r.titleZh ?? undefined,
    summary: r.summary,
    recommendation: r.recommendation ?? undefined,
    url: r.url,
    permalink: r.permalink,
    source: r.source,
    sources: (Array.isArray(r.sources) ? r.sources : [r.source]) as string[],
    publishedAt: new Date(r.publishedAt).toISOString(),
    collectedAt: new Date(r.collectedAt).toISOString(),
    category: r.category,
    tags: (Array.isArray(r.tags) ? r.tags : []) as string[],
    score: r.score,
    selected: r.selected,
    dailyDate: r.dailyDate ?? undefined,
    paperFields: r.paperFields ?? undefined,
    projectFields: r.projectFields ?? undefined,
    newsFields: r.newsFields ?? undefined,
    videoFields: r.videoFields ?? undefined,
    interpretation: r.interpretation ?? undefined,
    attribution:
      r.attribution && typeof r.attribution === "object"
        ? r.attribution
        : { source: r.source, canonical: r.permalink },
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

function rowToSource(r: any): Source {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    category: r.category,
    url: r.url,
    enabled: r.enabled,
    lastFetch: r.lastFetch ? new Date(r.lastFetch).toISOString() : undefined,
    fetchInterval: r.fetchInterval,
  };
}

// 清洗会破坏 PostgreSQL/Prisma JSON 序列化的非法字符：
//  - 孤立的 UTF-16 代理项（emoji 等高代理项被 XML/CDATA 解析截断导致，serde_json 报
//    "unexpected end of hex escape"）→ 替换为 U+FFFD
//  - 除 \n \t \r 外的控制字符 → 丢弃
//  - 以反斜杠结尾的字符串 → 末尾补空格（防御边界情况）
function sanitizeStr(s: any): string {
  if (typeof s !== "string") return s == null ? "" : String(s);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const lo = s.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        out += s.slice(i, i + 2);
        i++;
      } else {
        out += "�";
      }
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) {
      out += "�";
      continue;
    }
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) continue;
    out += s[i];
  }
  if (out.endsWith("\\")) out += " ";
  return out;
}

// 递归清洗任意结构里的字符串叶子（用于 sources / tags / attribution 等 Json 列）
function sanitizeDeep(v: any): any {
  if (typeof v === "string") return sanitizeStr(v);
  if (Array.isArray(v)) return v.map(sanitizeDeep);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = sanitizeDeep(v[k]);
    return o;
  }
  return v;
}

// Item 公共写字段（不含 id / url / createdAt）
function toCommon(r: Item): Prisma.ItemUpdateInput {
  const c: any = {
    type: r.type,
    title: sanitizeStr(r.title),
    titleZh: r.title_zh ? sanitizeStr(r.title_zh) : null,
    summary: sanitizeStr(r.summary),
    recommendation: r.recommendation ? sanitizeStr(r.recommendation) : null,
    permalink: sanitizeStr(r.permalink),
    source: sanitizeStr(r.source),
    sources: sanitizeDeep(r.sources),
    publishedAt: new Date(r.publishedAt),
    collectedAt: new Date(r.collectedAt),
    category: sanitizeStr(r.category),
    tags: sanitizeDeep(r.tags),
    score: r.score,
    selected: r.selected,
    dailyDate: r.dailyDate ?? null,
    attribution: sanitizeDeep(r.attribution),
    updatedAt: new Date(),
  };
  c.paperFields = r.paperFields ? r.paperFields : Prisma.JsonNull;
  c.projectFields = r.projectFields ? r.projectFields : Prisma.JsonNull;
  c.newsFields = r.newsFields ? r.newsFields : Prisma.JsonNull;
  c.videoFields = r.videoFields ? r.videoFields : Prisma.JsonNull;
  c.interpretation = r.interpretation ? r.interpretation : Prisma.JsonNull;
  return c as Prisma.ItemUpdateInput;
}

async function upsertItem(r: Item): Promise<Item> {
  const common = toCommon(r);
  const row: any = await prisma.item.upsert({
    where: { url: r.url },
    create: { ...(common as any), id: r.id, url: r.url, createdAt: new Date(r.createdAt) },
    update: common,
  });
  return rowToItem(row);
}

// ============ 读取：通用 ============

// 内部信源：仅入库用于分析、不外放（微博 weibo / X twitter）。
// 注意：Item.source 字段存的是「信源名称」而非 id（如 "Allie K. Miller"），
// 故以信源定义中的 id/名称集合统一判定，集中在此一处；未来要恢复外放只需改这里。
const INTERNAL_SOURCE_IDS = new Set(
  SOURCES.filter((s) => s.type === "weibo" || s.type === "twitter").map((s) => s.id),
);
const INTERNAL_SOURCE_NAMES = new Set(
  SOURCES.filter((s) => s.type === "weibo" || s.type === "twitter").map((s) => s.name),
);
export function isInternalSource(idOrName: string): boolean {
  return INTERNAL_SOURCE_IDS.has(idOrName) || INTERNAL_SOURCE_NAMES.has(idOrName);
}

// includeInternal=false（默认）时过滤掉内部信源条目，使其不出现在任何公开出口。
async function allItems(includeInternal = false): Promise<Item[]> {
  const rows = await prisma.item.findMany({ orderBy: { publishedAt: "desc" } });
  const items = rows.map(rowToItem);
  return includeInternal ? items : items.filter((i) => !isInternalSource(i.source));
}

// 游标分页：cursor = base64(offset)
function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}
function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const obj = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof obj.o === "number" ? obj.o : 0;
  } catch {
    return 0;
  }
}

function byNewest(a: Item, b: Item): number {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

export interface ItemsQuery {
  mode?: "selected" | "all";
  type?: ItemType;
  since?: string; // ISO
  take?: number;
  cursor?: string;
  q?: string;
  tag?: string;
  category?: string;
  hasInterpretation?: boolean; // 筛选是否已有解读
  includeInternal?: boolean; // 后台/分析用：含内部信源（默认不含，不外放）
}

export async function getItems(q: ItemsQuery = {}): Promise<ItemsResponse> {
  const mode = q.mode ?? "selected";
  const take = Math.min(Math.max(q.take ?? SITE.defaultTake, 1), SITE.maxTake);
  const offset = decodeCursor(q.cursor);

  let list = await allItems(q.includeInternal ?? false);
  if (mode === "selected") list = list.filter((i) => i.selected);
  if (q.type) list = list.filter((i) => i.type === q.type);
  if (q.category) list = list.filter((i) => i.category === q.category);
  if (q.tag) list = list.filter((i) => i.tags.includes(q.tag!));
  if (typeof q.hasInterpretation === "boolean")
    list = list.filter((i) => (q.hasInterpretation ? !!i.interpretation : !i.interpretation));
  if (q.since) {
    const since = new Date(q.since).getTime();
    list = list.filter((i) => new Date(i.publishedAt).getTime() >= since);
  }
  if (q.q) {
    const kw = q.q.toLowerCase();
    list = list.filter(
      (i) =>
        i.title.toLowerCase().includes(kw) ||
        (i.title_zh ?? "").toLowerCase().includes(kw) ||
        i.summary.toLowerCase().includes(kw) ||
        i.tags.some((t: string) => t.toLowerCase().includes(kw)),
    );
  }
  list.sort(byNewest);

  const slice = list.slice(offset, offset + take);
  const nextOffset = offset + take;
  const hasNext = nextOffset < list.length;

  return {
    count: slice.length,
    hasNext,
    nextCursor: hasNext ? encodeCursor(nextOffset) : undefined,
    items: slice,
  };
}

export async function getItem(id: string): Promise<Item | undefined> {
  const row = await prisma.item.findUnique({ where: { id } });
  return row ? rowToItem(row) : undefined;
}

export function getCategories(): Category[] {
  return CATEGORIES;
}

// 以 Asia/Shanghai(UTC+8) 计算「今天」的日期串（YYYY-MM-DD）。
// 简报面向中文读者，按北京时间归日，避免 UTC 归日在本地凌晨错位。
function todayCst(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
// 某个 CST 日历日对应的 UTC 时间边界（用于按 collectedAt 过滤）。
function cstDayBounds(dateCst: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateCst}T00:00:00.000+08:00`),
    end: new Date(`${dateCst}T23:59:59.999+08:00`),
  };
}

function buildDaily(date: string, items: Item[]): Daily {
  const sections: Section[] = [
    { label: "arXiv 最新论文", type: "paper", items: items.filter((i) => i.type === "paper") },
    { label: "GitHub 热门开源项目", type: "project", items: items.filter((i) => i.type === "project") },
    { label: "精选 AI 行业资讯", type: "news", items: items.filter((i) => i.type === "news") },
    { label: "YouTube 热门 AI 视频", type: "video", items: items.filter((i) => i.type === "video") },
  ];
  const total = items.length;
  const lead = [...items].sort((a, b) => b.score - a.score)[0];
  const { start, end } = cstDayBounds(date);
  const dayStart = start.toISOString();
  const dayEnd = end.toISOString();
  return {
    date,
    generatedAt: dayEnd,
    windowStart: dayStart,
    windowEnd: dayEnd,
    lead: lead ? { title: lead.title, summary: lead.summary } : undefined,
    sections,
    stats: {
      totalItems: total,
      readingTime: `${Math.max(1, Math.round(total * 0.6))} 分钟`,
      tokenCost: total * 1800,
    },
  };
}

export async function getDaily(date?: string): Promise<Daily | null> {
  const target = date ?? todayCst();
  const dayItems = (await allItems()).filter((i) => i.dailyDate === target).sort(byNewest);
  if (dayItems.length === 0) return null;
  return buildDaily(target, dayItems);
}

export async function getDailies(take = 30): Promise<Daily[]> {
  const all = await allItems();
  const dates = Array.from(new Set(all.map((i) => i.dailyDate).filter(Boolean))) as string[];
  dates.sort((a, b) => (a < b ? 1 : -1));
  return dates.slice(0, take).map((d) => {
    const dayItems = all.filter((i) => i.dailyDate === d).sort(byNewest);
    return buildDaily(d, dayItems);
  });
}

export async function getHot(take = 5): Promise<Item[]> {
  return (await allItems()).sort((a, b) => hotness(b) - hotness(a)).slice(0, take);
}

export interface SearchQuery {
  q: string;
  type?: ItemType;
  page?: number;
  pageSize?: number;
}

export async function searchItems(q: SearchQuery): Promise<SearchResponse> {
  const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), SITE.maxTake);
  const page = Math.max(q.page ?? 1, 1);
  const kw = q.q.toLowerCase();

  let list = (await allItems()).filter(
    (i) =>
      i.title.toLowerCase().includes(kw) ||
      (i.title_zh ?? "").toLowerCase().includes(kw) ||
      i.summary.toLowerCase().includes(kw) ||
      i.tags.some((t: string) => t.toLowerCase().includes(kw)) ||
      i.source.toLowerCase().includes(kw),
  );
  if (q.type) list = list.filter((i) => i.type === q.type);
  list.sort(byNewest);

  const start = (page - 1) * pageSize;
  const slice = list.slice(start, start + pageSize);
  return {
    count: slice.length,
    page,
    pageSize,
    hasNext: start + pageSize < list.length,
    items: slice,
  };
}

export async function getTags(): Promise<TagInfo[]> {
  const map = new Map<string, number>();
  for (const i of await allItems()) for (const t of i.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getItemsByTag(tag: string, take = 50): Promise<Item[]> {
  return (await allItems()).filter((i) => i.tags.includes(tag)).sort(byNewest).slice(0, take);
}

export async function getItemsByCategory(category: string, take = 50): Promise<Item[]> {
  return (await allItems()).filter((i) => i.category === category).sort(byNewest).slice(0, take);
}

// ============ 内部社媒（X / 微博）读取：分析专用 ============
// 仅返回 weibo / twitter 内部信源（按 Item.source 名称集合筛选，不过滤掉内部数据）。
// 支持按平台、按近 N 天、限量；供 /api/internal/social 做热点分析与选题。
export async function getInternalSocialItems(opts: {
  sourceType?: "weibo" | "twitter";
  days?: number;
  take?: number;
} = {}): Promise<Item[]> {
  const names =
    opts.sourceType === "weibo" || opts.sourceType === "twitter"
      ? SOURCES.filter((s) => s.type === opts.sourceType).map((s) => s.name)
      : Array.from(INTERNAL_SOURCE_NAMES);
  const where: any = { source: { in: names } };
  if (opts.days && opts.days > 0) {
    where.publishedAt = { gte: new Date(Date.now() - opts.days * 86_400_000) };
  }
  const rows = await prisma.item.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: Math.min(Math.max(opts.take ?? 500, 1), 1000),
  });
  return rows.map(rowToItem);
}

// ============ 信源 / 设置 ============

export async function getSources(): Promise<Source[]> {
  const rows = await prisma.source.findMany({ orderBy: { id: "asc" } });
  return rows.map(rowToSource);
}

export async function getSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (!row) return defaultSettings();
  return {
    siteName: row.siteName,
    title: row.title,
    description: row.description,
    itemsPerDay: row.itemsPerDay,
    autoSelectThreshold: row.autoSelectThreshold,
  };
}

// ============ 写操作（后台管理 / 采集用）============

function newId(): string {
  return `item_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export type ItemInput = Partial<Item> & {
  type: ItemType;
  title: string;
  url: string;
  source: string;
  category: string;
};

export async function createItem(input: ItemInput): Promise<Item> {
  const now = new Date().toISOString();
  const id = input.id ?? newId();
  const base: Item = {
    id,
    type: input.type,
    title: input.title,
    title_zh: input.title_zh,
    summary: input.summary ?? "",
    recommendation: input.recommendation,
    url: input.url,
    permalink: `${SITE.url}/items/${id}`,
    source: input.source,
    sources: input.sources && input.sources.length ? input.sources : [input.source],
    publishedAt: input.publishedAt ?? now,
    collectedAt: now,
    category: input.category,
    tags: input.tags ?? [],
    score: input.score ?? 0,
    selected: input.selected ?? true,
    dailyDate: input.dailyDate,
    paperFields: input.paperFields,
    projectFields: input.projectFields,
    newsFields: input.newsFields,
    videoFields: input.videoFields,
    attribution: { source: "hackcv", canonical: `${SITE.url}/items/${id}` },
    createdAt: now,
    updatedAt: now,
  };
  base.score = input.score ?? computeScore(base);
  return upsertItem(base);
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item | null> {
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return null;
  const prev = rowToItem(existing);
  const merged: Item = { ...prev, ...patch, id, updatedAt: new Date().toISOString() };
  merged.score = patch.score ?? computeScore(merged);
  const common = toCommon(merged);
  await prisma.item.update({ where: { id }, data: common });
  return merged;
}

export async function deleteItem(id: string): Promise<boolean> {
  try {
    await prisma.item.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function updateSource(id: string, patch: Partial<Source>): Promise<Source | null> {
  const existing = await prisma.source.findUnique({ where: { id } });
  if (!existing) return null;
  const data: any = { ...patch };
  delete data.id;
  const row = await prisma.source.update({ where: { id }, data });
  return rowToSource(row);
}

export async function updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const data: Prisma.SiteSettingUpdateInput = { ...patch };
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...defaultSettings(), ...(patch as any) },
    update: data,
  });
  return getSettings();
}

// ============ 更新日志（后台可编辑）============

export interface ChangelogEntry {
  id: string;
  version: string; // 如 2026-07-12（同时作为日期 / 排序键）
  title: string;
  items: string[];
  createdAt: string;
  updatedAt: string;
}

function rowToChangelog(r: any): ChangelogEntry {
  return {
    id: r.id,
    version: r.version,
    title: r.title,
    items: Array.isArray(r.items) ? (r.items as string[]) : [],
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function getChangelogs(): Promise<ChangelogEntry[]> {
  const rows = await prisma.changelog.findMany({ orderBy: { version: "desc" } });
  return rows.map(rowToChangelog);
}

export async function createChangelog(input: {
  version: string;
  title: string;
  items: string[];
}): Promise<ChangelogEntry> {
  const row = await prisma.changelog.create({
    data: { version: input.version, title: input.title, items: input.items },
  });
  return rowToChangelog(row);
}

export async function updateChangelog(
  id: string,
  patch: { version?: string; title?: string; items?: string[] },
): Promise<ChangelogEntry | null> {
  const existing = await prisma.changelog.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.changelog.update({ where: { id }, data: patch });
  return rowToChangelog(row);
}

export async function deleteChangelog(id: string): Promise<boolean> {
  try {
    await prisma.changelog.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export interface AdminStats {
  totalItems: number;
  selectedItems: number;
  internalItems: number; // 内部信源（仅入库用于分析、不外放）
  papers: number;
  projects: number;
  news: number;
  videos: number;
  dailies: number;
  sources: number;
  enabledSources: number;
  topScore: number;
  feedbackCount: number; // 用户反馈（含未读）
}

export async function getAdminStats(): Promise<AdminStats> {
  const [total, selected, internal, papers, projects, news, videos, sources, enabledSources, feedbackCount] = await Promise.all([
    prisma.item.count(),
    prisma.item.count({ where: { selected: true } }),
    prisma.item.count({
      where: { source: { in: Array.from(INTERNAL_SOURCE_NAMES) } },
    }),
    prisma.item.count({ where: { type: "paper" } }),
    prisma.item.count({ where: { type: "project" } }),
    prisma.item.count({ where: { type: "news" } }),
    prisma.item.count({ where: { type: "video" } }),
    prisma.source.count(),
    prisma.source.count({ where: { enabled: true } }),
    prisma.feedback.count(),
  ]);
  const dated = await prisma.item.findMany({
    where: { dailyDate: { not: null } },
    select: { dailyDate: true },
  });
  const dailies = new Set(dated.map((d) => d.dailyDate)).size;
  const top = await prisma.item.aggregate({ _max: { score: true } });
  return {
    totalItems: total,
    selectedItems: selected,
    internalItems: internal,
    papers,
    projects,
    news,
    videos,
    dailies,
    sources,
    enabledSources,
    topScore: top._max.score ?? 0,
    feedbackCount,
  };
}

// ============ 用户反馈 ============

export interface FeedbackEntry {
  id: string;
  message: string;
  contact: string | null;
  page: string | null;
  status: string; // new | read | resolved
  createdAt: string;
  updatedAt: string;
}

function rowToFeedback(r: any): FeedbackEntry {
  return {
    id: r.id,
    message: r.message,
    contact: r.contact ?? null,
    page: r.page ?? null,
    status: r.status,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function getFeedbacks(): Promise<FeedbackEntry[]> {
  const rows = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(rowToFeedback);
}

export async function createFeedback(input: {
  message: string;
  contact?: string | null;
  page?: string | null;
}): Promise<FeedbackEntry> {
  const row = await prisma.feedback.create({
    data: {
      message: input.message,
      contact: input.contact ?? null,
      page: input.page ?? null,
    },
  });
  return rowToFeedback(row);
}

export async function updateFeedback(
  id: string,
  patch: { status?: string },
): Promise<FeedbackEntry | null> {
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.feedback.update({ where: { id }, data: patch });
  return rowToFeedback(row);
}

export async function deleteFeedback(id: string): Promise<boolean> {
  try {
    await prisma.feedback.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ============ Token 消耗统计 ============

export interface TokenAgg {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  items: number;
  runs: number;
}

export interface TokenStats {
  total: TokenAgg; // 累计
  today: TokenAgg; // 今日
  byDay: { date: string; totalTokens: number; items: number; runs: number }[];
  byProvider: { provider: string; totalTokens: number; items: number; runs: number }[];
}

export async function recordTokenUsage(input: {
  date: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  items: number;
}): Promise<void> {
  await prisma.tokenUsage.create({
    data: {
      date: input.date,
      provider: input.provider,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      items: input.items,
    },
  });
}

export async function getTokenStats(): Promise<TokenStats> {
  const rows = await prisma.tokenUsage.findMany({ orderBy: { date: "asc" } });
  const today = new Date().toISOString().slice(0, 10);
  const empty = (): TokenAgg => ({ promptTokens: 0, completionTokens: 0, totalTokens: 0, items: 0, runs: 0 });
  const add = (a: TokenAgg, r: { promptTokens: number; completionTokens: number; totalTokens: number; items: number }) => {
    a.promptTokens += r.promptTokens;
    a.completionTokens += r.completionTokens;
    a.totalTokens += r.totalTokens;
    a.items += r.items;
    a.runs += 1;
  };
  const total = empty();
  const td = empty();
  const dayMap = new Map<string, TokenAgg>();
  const provMap = new Map<string, TokenAgg>();
  for (const r of rows) {
    add(total, r);
    if (r.date === today) add(td, r);
    const d = dayMap.get(r.date) ?? empty();
    add(d, r);
    dayMap.set(r.date, d);
    const p = provMap.get(r.provider) ?? empty();
    add(p, r);
    provMap.set(r.provider, p);
  }
  const byDay = [...dayMap.entries()].map(([date, a]) => ({
    date,
    totalTokens: a.totalTokens,
    items: a.items,
    runs: a.runs,
  }));
  const byProvider = [...provMap.entries()].map(([provider, a]) => ({
    provider,
    totalTokens: a.totalTokens,
    items: a.items,
    runs: a.runs,
  }));
  return { total, today: td, byDay, byProvider };
}

/**
 * 生成（或刷新）某日的 AI 研究简报：
 * 将该日「收录（collectedAt）」且精选的条目标记为 dailyDate = date，随后由 getDaily 组装。
 * 按收录日归日（而非原始 publishedAt）——今日收录的精选内容即今日简报，
 * 这样每次采集都能产出简报，且不会因论文原始发布日分散而漏项。
 */
export async function generateDaily(date?: string): Promise<Daily | null> {
  const target = date ?? todayCst();
  const { start, end } = cstDayBounds(target);
  await prisma.item.updateMany({
    where: {
      selected: true,
      collectedAt: { gte: start, lte: end },
    },
    data: { dailyDate: target },
  });
  return getDaily(target);
}

// ============ 采集专用辅助 ============

export interface IngestKeys {
  urls: string[];
  titles: string[];
}

/** 供去重：返回已存在条目的 url / 小写标题集合 */
export async function getExistingForIngest(): Promise<IngestKeys> {
  const rows = await prisma.item.findMany({ select: { url: true, title: true } });
  return {
    urls: rows.map((r) => r.url),
    titles: rows.map((r) => r.title.toLowerCase()),
  };
}

/** 采集成功后更新信源的最后抓取时间 */
export async function touchSource(id: string, atIso: string): Promise<void> {
  await prisma.source
    .update({ where: { id }, data: { lastFetch: new Date(atIso) } })
    .catch(() => undefined);
}

// ============ 种子 / 初始化 ============

export function defaultSettings(): SiteSettings {
  return {
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    itemsPerDay: 30,
    autoSelectThreshold: 55,
  };
}

export async function upsertSource(s: Source): Promise<Source> {
  const row = await prisma.source.upsert({
    where: { id: s.id },
    create: { ...s },
    update: { ...s },
  });
  return rowToSource(row);
}

export async function upsertSettings(s: SiteSettings): Promise<SiteSettings> {
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...s },
    update: { ...s },
  });
  return getSettings();
}

/** 直接写入一条 Item（种子/导入用，按 url 去重 upsert） */
export async function upsertItemExternal(item: Item): Promise<Item> {
  return upsertItem(item);
}
