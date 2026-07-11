import type { Source } from "./types";

// 重构方案 §8.1 信源体系
// 注：Anthropic 已停更 RSS、机器之心 RSS 改为数据服务页、Papers With Code API 长期超时，
// 故这三者分别替换为 Google AI Blog / 雷锋网 / TechCrunch AI（均经实测可用）。
export const SOURCES: Source[] = [
  {
    id: "arxiv-ai",
    name: "arXiv (cs.AI / cs.CL / cs.LG / cs.CV)",
    type: "api",
    category: "paper",
    url: "http://export.arxiv.org/api/query",
    enabled: true,
    fetchInterval: 86_400,
  },
  {
    id: "github-trending",
    name: "GitHub Trending (AI/ML)",
    type: "scraper",
    category: "project",
    url: "https://github.com/trending",
    enabled: true,
    fetchInterval: 86_400,
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    type: "api",
    category: "news",
    url: "https://hn.algolia.com/api/v1/search",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "36kr",
    name: "36氪",
    type: "rss",
    category: "news",
    url: "https://36kr.com/feed",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "qbitai",
    name: "量子位",
    type: "rss",
    category: "news",
    url: "https://www.qbitai.com/feed",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "openai-blog",
    name: "OpenAI Blog",
    type: "rss",
    category: "company",
    url: "https://openai.com/blog/rss.xml",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "google-ai",
    name: "Google AI Blog",
    type: "rss",
    category: "company",
    url: "https://blog.google/technology/ai/rss/",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "leiphone",
    name: "雷锋网 AI",
    type: "rss",
    category: "news",
    url: "https://www.leiphone.com/feed",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    type: "rss",
    category: "news",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    enabled: true,
    fetchInterval: 3_600,
  },
];

export function getSource(name: string): Source | undefined {
  return SOURCES.find((s) => s.name === name);
}
