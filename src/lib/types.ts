// hackcv 内容模型 —— 参考重构方案 §7 数据模型设计
// 内容数据已正式持久化到 PostgreSQL（Prisma 访问，见 lib/db/repository.ts 与 prisma/schema.prisma）

export type ItemType = "paper" | "project" | "news" | "video";

export type SourceType = "rss" | "api" | "scraper" | "manual" | "youtube" | "twitter";

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

export interface VideoFields {
  channel: string; // 频道名（如 "Two Minute Papers"）
  channelId: string; // YouTube channel_id（UC...）
  viewCount: number; // 播放量
  likeCount?: number;
  duration?: string; // 形如 "12:34" 或 "1:02:03"
  thumbnail?: string; // 缩略图 URL
}

export interface Attribution {
  source: string;
  canonical: string;
}

// 论文 / 代码解读（结构化，由 LLM 生成）
export interface Interpretation {
  kind: "paper" | "project";
  summary: string; // 一句话中文导读
  fields: Record<string, string | string[]>; // 结构化解读项
  generatedAt: string; // ISO
  provider: string; // 实际生成供应商
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
  videoFields?: VideoFields;
  interpretation?: Interpretation;
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
  category: string; // 信源默认分类（slug，如 paper/project/news/company）
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

// 站点设置（后台可编辑）
export interface SiteSettings {
  siteName: string;
  title: string;
  description: string;
  itemsPerDay: number; // 每日简报精选条目上限
  autoSelectThreshold: number; // 抓取条目精选分 >= 此值则自动入选（0-100）
}

// 登录会话载荷（HMAC 签名，见 lib/auth.ts）
export interface SessionPayload {
  user: string;
  exp: number; // 过期时间戳（秒）
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
