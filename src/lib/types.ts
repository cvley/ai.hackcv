// hackcv 内容模型 —— 参考重构方案 §7 数据模型设计
// 运行时使用内存/JSON 仓储（见 lib/db/repository.ts），生产环境可平滑替换为 PostgreSQL（见 prisma/schema.prisma）

export type ItemType = "paper" | "project" | "news";

export type SourceType = "rss" | "api" | "scraper" | "manual";

export interface PaperFields {
  arxivId: string;
  authors: string[];
  domains: string[];
  pdfUrl: string;
}

export interface ProjectFields {
  repo: string; // owner/name
  language: string;
  stars: number;
  todayStars: number;
  license: string;
}

export interface NewsFields {
  sourceUrls: string[];
}

export interface Attribution {
  source: string;
  canonical: string;
}

export interface Item {
  id: string; // ULID/CUID
  type: ItemType;
  title: string;
  title_zh?: string;
  summary: string;
  recommendation?: string;
  url: string;
  permalink: string;
  source: string; // 主信源
  sources: string[]; // 多信源
  publishedAt: string; // ISO 8601
  collectedAt: string; // ISO 8601
  category: string; // 分类 slug
  tags: string[];
  score: number; // LLM 精选分数 0-100
  selected: boolean;
  dailyDate?: string; // 所属简报日期 YYYY-MM-DD
  paperFields?: PaperFields;
  projectFields?: ProjectFields;
  newsFields?: NewsFields;
  attribution: Attribution;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  label: string;
  type: ItemType;
  items: Item[];
}

export interface DailyStats {
  totalItems: number;
  readingTime: string;
  tokenCost: number;
}

export interface DailyLead {
  title: string;
  summary: string;
}

export interface Daily {
  date: string; // YYYY-MM-DD
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  lead?: DailyLead;
  sections: Section[];
  stats: DailyStats;
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  category: ItemType;
  url: string;
  enabled: boolean;
  lastFetch?: string;
  fetchInterval: number; // 秒
}

export interface Category {
  slug: string;
  label: string;
  type: ItemType;
  description?: string;
}

// ---- API 响应包装 ----

export interface ItemsResponse {
  count: number;
  hasNext: boolean;
  nextCursor?: string;
  items: Item[];
}

export interface SearchResponse {
  count: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  items: Item[];
}

export interface TagInfo {
  tag: string;
  count: number;
}
