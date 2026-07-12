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
} from "../types";
import { CATEGORIES } from "./seed";
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

// Item 公共写字段（不含 id / url / createdAt）
function toCommon(r: Item): Prisma.ItemUpdateInput {
  const c: any = {
    type: r.type,
    title: r.title,
    titleZh: r.title_zh ?? null,
    summary: r.summary,
    recommendation: r.recommendation ?? null,
    permalink: r.permalink,
    source: r.source,
    sources: r.sources,
    publishedAt: new Date(r.publishedAt),
    collectedAt: new Date(r.collectedAt),
    category: r.category,
    tags: r.tags,
    score: r.score,
    selected: r.selected,
    dailyDate: r.dailyDate ?? null,
    attribution: r.attribution,
    updatedAt: new Date(),
  };
  c.paperFields = r.paperFields ? r.paperFields : Prisma.JsonNull;
  c.projectFields = r.projectFields ? r.projectFields : Prisma.JsonNull;
  c.newsFields = r.newsFields ? r.newsFields : Prisma.JsonNull;
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

async function allItems(): Promise<Item[]> {
  const rows = await prisma.item.findMany({ orderBy: { publishedAt: "desc" } });
  return rows.map(rowToItem);
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
}

export async function getItems(q: ItemsQuery = {}): Promise<ItemsResponse> {
  const mode = q.mode ?? "selected";
  const take = Math.min(Math.max(q.take ?? SITE.defaultTake, 1), SITE.maxTake);
  const offset = decodeCursor(q.cursor);

  let list = await allItems();
  if (mode === "selected") list = list.filter((i) => i.selected);
  if (q.type) list = list.filter((i) => i.type === q.type);
  if (q.category) list = list.filter((i) => i.category === q.category);
  if (q.tag) list = list.filter((i) => i.tags.includes(q.tag!));
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

function buildDaily(date: string, items: Item[]): Daily {
  const sections: Section[] = [
    { label: "arXiv 最新论文", type: "paper", items: items.filter((i) => i.type === "paper") },
    { label: "GitHub 热门开源项目", type: "project", items: items.filter((i) => i.type === "project") },
    { label: "精选 AI 行业资讯", type: "news", items: items.filter((i) => i.type === "news") },
  ];
  const total = items.length;
  const lead = [...items].sort((a, b) => b.score - a.score)[0];
  const dayStart = new Date(`${date}T00:00:00Z`).toISOString();
  const dayEnd = new Date(`${date}T23:59:59Z`).toISOString();
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
  const target = date ?? new Date().toISOString().slice(0, 10);
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
  papers: number;
  projects: number;
  news: number;
  dailies: number;
  sources: number;
  enabledSources: number;
  topScore: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [total, selected, papers, projects, news, sources, enabledSources] = await Promise.all([
    prisma.item.count(),
    prisma.item.count({ where: { selected: true } }),
    prisma.item.count({ where: { type: "paper" } }),
    prisma.item.count({ where: { type: "project" } }),
    prisma.item.count({ where: { type: "news" } }),
    prisma.source.count(),
    prisma.source.count({ where: { enabled: true } }),
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
    papers,
    projects,
    news,
    dailies,
    sources,
    enabledSources,
    topScore: top._max.score ?? 0,
  };
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
 * 将该日已发布且精选的条目标记为 dailyDate = date，随后由 getDaily 组装。
 */
export async function generateDaily(date?: string): Promise<Daily | null> {
  const target = date ?? new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${target}T00:00:00Z`);
  const dayEnd = new Date(`${target}T23:59:59Z`);
  await prisma.item.updateMany({
    where: {
      selected: true,
      publishedAt: { gte: dayStart, lte: dayEnd },
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
