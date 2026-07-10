import type { Source } from "./types";

// 重构方案 §8.1 信源体系
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
    id: "jiqizhixin",
    name: "机器之心",
    type: "rss",
    category: "news",
    url: "https://www.jiqizhixin.com/rss",
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
    category: "news",
    url: "https://openai.com/blog/rss.xml",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "anthropic-news",
    name: "Anthropic News",
    type: "rss",
    category: "news",
    url: "https://www.anthropic.com/news/rss.xml",
    enabled: true,
    fetchInterval: 3_600,
  },
  {
    id: "paperswithcode",
    name: "Papers With Code",
    type: "api",
    category: "paper",
    url: "https://paperswithcode.com/api/v1",
    enabled: true,
    fetchInterval: 86_400,
  },
];

export function getSource(name: string): Source | undefined {
  return SOURCES.find((s) => s.name === name);
}
