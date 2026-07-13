import type { Item, ItemType, Source } from "./types";

// 抓取得到的原始条目（尚未打分/入库）
export interface RawItem extends Partial<Item> {
  url: string;
  type: ItemType;
  source: string; // 信源展示名
  category: string; // 分类 slug
  title: string;
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
}
function attr(block: string, name: string, attr: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*\\b${attr}="([^"]*)"`, "i"));
  return m ? m[1] : "";
}
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const UA = "hackcv-ingest/1.0 (+https://ai.hackcv.com)";

async function getText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const r = await fetch(url, {
    headers: { "user-agent": UA, ...headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

function arxivCategoryToSlug(primary: string): string {
  switch (primary) {
    case "cs.CV":
      return "vision";
    case "cs.CL":
      return "nlp";
    case "cs.AI":
      return "agent";
    case "cs.LG":
      return "research";
    default:
      return "research";
  }
}

async function fetchArxiv(src: Source): Promise<RawItem[]> {
  const url =
    "http://export.arxiv.org/api/query?search_query=" +
    encodeURIComponent("cat:cs.AI OR cat:cs.CL OR cat:cs.LG OR cat:cs.CV") +
    "&sortBy=submittedDate&sortOrder=descending&max_results=24";
  const xml = await getText(url);
  const entries = xml.split("<entry>").slice(1);
  return entries.map((e) => {
    const block = e.split("</entry>")[0];
    const rawTitle = decode(tag(block, "title"));
    const summary = decode(tag(block, "summary"));
    const idUrl = tag(block, "id") || attr(block, "link", "href");
    const published = tag(block, "published") || tag(block, "updated");
    const primary = attr(block, "arxiv:primary_category", "term") || tag(block, "category").match(/term="([^"]+)"/)?.[1] || "cs.LG";
    const authors = (block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g) || [])
      .map((a) => decode(a.replace(/<[^>]+>/g, " ")))
      .slice(0, 3);
    return {
      url: idUrl,
      type: "paper" as ItemType,
      source: "arXiv",
      category: arxivCategoryToSlug(primary),
      title: rawTitle,
      summary,
      publishedAt: published ? new Date(published).toISOString() : undefined,
      paperFields: {
        arxivId: (idUrl.match(/abs\/(.+)$/) || [])[1] || undefined,
        authors,
        domains: [primary],
        pdfUrl:
          (idUrl.match(/abs\/(.+)$/) || [])[1] || undefined
            ? `https://arxiv.org/pdf/${(idUrl.match(/abs\/(.+)$/) || [])[1] || ""}`
            : undefined,
      },
      tags: [primary.replace("cs.", "cs.")],
    };
  }) as unknown as RawItem[];
}

async function fetchGithub(src: Source): Promise<RawItem[]> {
  const q = encodeURIComponent("topic:llm topic:ai created:>2022-01-01");
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`;
  const d = JSON.parse(await getText(url, { accept: "application/vnd.github+json" }));
  return (d.items || []).map((r: any) => ({
    url: r.html_url,
    type: "project" as ItemType,
    source: "GitHub",
    category: "coding",
    title: r.full_name,
    summary: decode(r.description || ""),
    publishedAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    projectFields: { stars: r.stargazers_count, language: r.language, owner: r.owner?.login },
    tags: [r.language, "github"].filter(Boolean) as string[],
  }));
}

async function fetchHN(src: Source): Promise<RawItem[]> {
  const url = "https://hn.algolia.com/api/v1/search?tags=story&query=" + encodeURIComponent("artificial intelligence") + "&hitsPerPage=20";
  const d = JSON.parse(await getText(url));
  return (d.hits || [])
    .filter((h: any) => h.title)
    .map((h: any) => ({
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      type: "news" as ItemType,
      source: "Hacker News",
      category: "research",
      title: decode(h.title),
      summary: h.url ? "" : "讨论帖：" + (h.title || ""),
      publishedAt: h.created_at_i ? new Date(h.created_at_i * 1000).toISOString() : undefined,
      newsFields: { points: h.points, by: h.author },
      tags: ["hacker-news"],
    }));
}

async function fetchRss(src: Source): Promise<RawItem[]> {
  const xml = await getText(src.url);
  const blocks = xml.includes("<item>") ? xml.split("<item>").slice(1) : xml.split("<entry>").slice(1);
  const catBySource: Record<string, string> = {
    "openai-blog": "company",
    "google-ai": "company",
  };
  const cat = catBySource[src.id] || "news";
  return blocks
    .map((b) => {
      const block = b.split(/<\/(item|entry)>/)[0];
      const linkTag = block.match(/<link[^>]*>/i)?.[0] || "";
      const link = attr(block, "link", "href") || tag(block, "link") || tag(block, "id");
      const title = decode(tag(block, "title"));
      const desc = decode(tag(block, "description") || tag(block, "content:encoded") || tag(block, "summary"));
      const pub = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
      if (!title || !link) return null;
      return {
        url: link,
        type: "news" as ItemType,
        source: src.name,
        category: cat,
        title,
        summary: desc.slice(0, 400),
        publishedAt: pub ? new Date(pub).toISOString() : undefined,
        tags: [src.id],
      };
    })
    .filter(Boolean) as unknown as RawItem[];
}

export const FETCHERS: Record<string, (src: Source) => Promise<RawItem[]>> = {
  "arxiv-ai": fetchArxiv,
  "github-trending": fetchGithub,
  "hacker-news": fetchHN,
  "36kr": fetchRss,
  qbitai: fetchRss,
  "openai-blog": fetchRss,
  "google-ai": fetchRss,
  leiphone: fetchRss,
  "techcrunch-ai": fetchRss,
};
