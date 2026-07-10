import type {
  Item,
  ItemType,
  Daily,
  Section,
  Category,
  ItemsResponse,
  SearchResponse,
  TagInfo,
} from "../types";
import { ITEMS, CATEGORIES } from "./seed";
import { hotness } from "../scoring";
import { SITE } from "../config";

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

export function getItems(q: ItemsQuery = {}): ItemsResponse {
  const mode = q.mode ?? "selected";
  const take = Math.min(Math.max(q.take ?? SITE.defaultTake, 1), SITE.maxTake);
  const offset = decodeCursor(q.cursor);

  let list = [...ITEMS];
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

export function getItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
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

export function getDaily(date?: string): Daily | null {
  const target = date ?? new Date().toISOString().slice(0, 10);
  const items = ITEMS.filter((i) => i.dailyDate === target).sort(byNewest);
  if (items.length === 0) return null;
  return buildDaily(target, items);
}

export function getDailies(take = 30): Daily[] {
  const dates = Array.from(new Set(ITEMS.map((i) => i.dailyDate).filter(Boolean))) as string[];
  dates.sort((a, b) => (a < b ? 1 : -1));
  return dates.slice(0, take).map((d) => {
    const items = ITEMS.filter((i) => i.dailyDate === d).sort(byNewest);
    return buildDaily(d, items);
  });
}

export function getHot(take = 5): Item[] {
  return [...ITEMS].sort((a, b) => hotness(b) - hotness(a)).slice(0, take);
}

export interface SearchQuery {
  q: string;
  type?: ItemType;
  page?: number;
  pageSize?: number;
}

export function searchItems(q: SearchQuery): SearchResponse {
  const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), SITE.maxTake);
  const page = Math.max(q.page ?? 1, 1);
  const kw = q.q.toLowerCase();

  let list = [...ITEMS].filter(
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

export function getTags(): TagInfo[] {
  const map = new Map<string, number>();
  for (const i of ITEMS) for (const t of i.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getItemsByTag(tag: string, take = 50): Item[] {
  return ITEMS.filter((i) => i.tags.includes(tag)).sort(byNewest).slice(0, take);
}

export function getItemsByCategory(category: string, take = 50): Item[] {
  return ITEMS.filter((i) => i.category === category).sort(byNewest).slice(0, take);
}
