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
  let r: Response;
  try {
    r = await fetch(url, {
      headers: { "user-agent": UA, ...headers },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    throw new Error(`fetch failed: ${e instanceof Error ? e.message : e} <- ${url}`);
  }
  if (!r.ok) {
    let body = "";
    try {
      body = (await r.text()).slice(0, 300);
    } catch {
      /* ignore body read error */
    }
    throw new Error(
      `HTTP ${r.status} ${r.statusText} <- ${url}${body ? " | body: " + body : ""}`,
    );
  }
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
    "https://export.arxiv.org/api/query?search_query=" +
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
  // 近期新建 + 高星的 AI 仓库，保证每天都有新内容。
  // 旧 query 用 created:>2022-01-01 + sort=stars 是「全时段最高星」，每天返回同一批
  // 老仓库 → 去重层全判为已存在 → created=0 → 日报「GitHub 项目」段恒空。
  // 改用滚动 14 天窗口 + 单 topic:ai（去掉 llm AND ai 双标签限制，覆盖更广）。
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const q = encodeURIComponent(`topic:ai created:>${since}`);
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`;
  const headers: Record<string, string> = { accept: "application/vnd.github+json" };
  // 未配置 GITHUB_TOKEN 时走匿名，搜索接口限流 10 次/分（共享 IP 易触发 403）。
  // 配置后升到 30 次/分、5000 次/时，并带鉴权身份。
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const d = JSON.parse(await getText(url, headers));
  if (!d.items || !Array.isArray(d.items)) {
    throw new Error(`GitHub search 返回异常（可能限流）: ${JSON.stringify(d).slice(0, 200)}`);
  }
  return (d.items || []).map((r: any) => ({
    url: r.html_url,
    type: "project" as ItemType,
    source: "GitHub",
    category: "coding",
    title: r.full_name,
    summary: decode(r.description || ""),
    publishedAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    projectFields: { repo: r.full_name, stars: r.stargazers_count, language: r.language, owner: r.owner?.login },
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

// 微博 / X(Twitter) 统一走自建 RSSHub（本地实例）：
//   - 微博路由 /weibo/user/{uid}（需数字 UID + 微博 Cookie，CookieCloud 已同步 weibo.com）
//   - X 路由   /twitter/user/{handle}（实例已配 guest token，无需登录 Cookie）
// 入口与 Basic Auth 凭据从环境变量读取，绝不硬编码进代码/仓库：
//   RSSHUB_BASE_URL  例如 https://hackcv.com/api/rsshub
//   RSSHUB_USER / RSSHUB_PASS  Basic Auth 账号密码
// src.url 存相对路径（如 "weibo/user/1727858283"、"twitter/user/karpathy"），
// 此处拼接 base 并追加 limit。
async function fetchRssHubFeed(src: Source): Promise<RawItem[]> {
  const base = process.env.RSSHUB_BASE_URL;
  if (!base) throw new Error("RSSHUB_BASE_URL 未配置，无法抓取 RSSHub 源");
  const path = src.url.replace(/^\/+/, "");
  const sep = path.includes("?") ? "&" : "?";
  const url = `${base.replace(/\/+$/, "")}/${path}${sep}limit=15`;
  const headers: Record<string, string> = {};
  const user = process.env.RSSHUB_USER;
  const pass = process.env.RSSHUB_PASS;
  if (user && pass) {
    headers.authorization =
      "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }
  return parseRssXml(await getText(url, headers), src);
}

// 微博 via 自建 RSSHub
export async function fetchWeibo(src: Source): Promise<RawItem[]> {
  return fetchRssHubFeed(src);
}

// X(Twitter) via 自建 RSSHub（替换原 xcancel 方案：xcancel 公共实例不稳定且按 TLS 指纹封 node fetch）
export async function fetchTwitter(src: Source): Promise<RawItem[]> {
  return fetchRssHubFeed(src);
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
