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

function parseRssXml(xml: string, src: Source): RawItem[] {
  const blocks = xml.includes("<item>") ? xml.split("<item>").slice(1) : xml.split("<entry>").slice(1);
  const cat = src.category || "news";
  return blocks
    .map((b) => {
      const block = b.split(/<\/(item|entry)>/)[0];
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

async function fetchRss(src: Source): Promise<RawItem[]> {
  return parseRssXml(await getText(src.url), src);
}

// Twitter/X via xcancel（Nitter 实例）。需伪装 RSS reader UA，否则返回
// "RSS reader not yet whitelisted!"。实测 Inoreader / FreshRSS / Tiny Tiny RSS UA 可用。
export async function fetchTwitter(src: Source): Promise<RawItem[]> {
  const r = await fetch(src.url, {
    headers: { "user-agent": "Inoreader/1.0 (+https://inoreader.com)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return parseRssXml(await r.text(), src);
}

function fmtDuration(sec: number): string {
  if (!sec || sec < 0) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}

// YouTube 频道 RSS（Atom 风格：<entry>）。无需 API Key，qq_claw 实测可直连。
// 字段：<yt:videoId> 视频ID、<published>、<author><name> 频道名、
// <media:group><media:thumbnail url> 缩略图、<media:community><media:statistics views/likes>、
// <yt:duration seconds> 时长。
export async function fetchYoutube(src: Source): Promise<RawItem[]> {
  const channelId = (src.url.match(/channel_id=([^&]+)/) || [])[1] || "";
  const xml = await getText(src.url);
  const entries = xml.includes("<entry>") ? xml.split("<entry>").slice(1) : [];
  return entries
    .map((e) => {
      const block = e.split(/<\/entry>/)[0];
      const videoId =
        tag(block, "yt:videoId") ||
        (attr(block, "link", "href").match(/[?&]v=([^&]+)/) || [])[1] ||
        "";
      const title = decode(tag(block, "title"));
      const link =
        attr(block, "link", "href") ||
        (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
      const pub = tag(block, "published") || tag(block, "updated");
      const channel = decode(tag(block, "name")) || src.name;
      const thumbnail = attr(block, "media:thumbnail", "url");
      const durationRaw =
        attr(block, "yt:duration", "seconds") || attr(block, "media:content", "duration");
      const duration = durationRaw ? fmtDuration(Number(durationRaw)) : undefined;
      const viewsRaw = attr(block, "media:statistics", "views");
      const views = viewsRaw ? Number(viewsRaw) : 0;
      const likesRaw = attr(block, "media:statistics", "likes");
      const likes = likesRaw ? Number(likesRaw) : undefined;
      if (!title || !link || !videoId) return null;
      return {
        url: link,
        type: "video" as ItemType,
        source: channel,
        category: "ai-video",
        title,
        summary: `YouTube · ${channel}`,
        publishedAt: pub ? new Date(pub).toISOString() : undefined,
        videoFields: {
          channel,
          channelId,
          viewCount: views,
          likeCount: likes,
          duration,
          thumbnail: thumbnail || undefined,
        },
        tags: ["ai-video", channel],
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
  "nvidia-blog": fetchRss,
  leiphone: fetchRss,
  "techcrunch-ai": fetchRss,
};
