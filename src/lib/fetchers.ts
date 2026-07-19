import { execFile } from "child_process";
import { promisify } from "util";
import type { Item, ItemType, Source } from "./types";

const execFileP = promisify(execFile);

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

async function getText(url: string, headers: Record<string, string> = {}, timeout = 20000): Promise<string> {
  let r: Response;
  try {
    r = await fetch(url, {
      headers: { "user-agent": UA, ...headers },
      signal: AbortSignal.timeout(timeout),
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

const ARXIV_CATS = ["cs.AI", "cs.CL", "cs.LG", "cs.CV"];

// 带 429 退避重试的抓取：arXiv API 对出口 IP 偶发限流（实测第一次重试即 200），
// 原 fetchArxiv 无重试会直接抛错导致 arxiv 信源长期沉默。仅对限流退避重试，其它错误直接抛出。
async function getTextWithRetry(
  url: string,
  headers: Record<string, string> = {},
  retries = 3,
  baseDelay = 5000,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await getText(url, headers);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (/HTTP 429|Too Many Requests/.test(msg) && attempt < retries) {
        const wait = baseDelay * Math.pow(2, attempt);
        console.warn(`[arxiv] 限流 429，第 ${attempt + 1} 次重试，等待 ${wait}ms <- ${url}`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function safeIso(s?: string): string | undefined {
  if (!s) return undefined;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? undefined : new Date(s).toISOString();
}

function parseArxivApiBlock(block: string): RawItem {
  const rawTitle = decode(tag(block, "title"));
  const summary = decode(tag(block, "summary"));
  const idUrl = tag(block, "id") || attr(block, "link", "href");
  const published = tag(block, "published") || tag(block, "updated");
  const primary =
    attr(block, "arxiv:primary_category", "term") ||
    tag(block, "category").match(/term="([^"]+)"/)?.[1] ||
    "cs.LG";
  const authors = (block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g) || [])
    .map((a) => decode(a.replace(/<[^>]+>/g, " ")))
    .slice(0, 3);
  const arxivId = (idUrl.match(/abs\/(.+)$/) || [])[1];
  return {
    url: idUrl,
    type: "paper",
    source: "arXiv",
    category: arxivCategoryToSlug(primary),
    title: rawTitle,
    summary,
    publishedAt: safeIso(published),
    paperFields: {
      arxivId,
      authors,
      domains: [primary],
      pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined,
    },
    tags: [primary.replace("cs.", "cs.")],
  } as unknown as RawItem;
}

// RSS 兜底：API 持续 429 时改抓 4 个分类 RSS（走 export.arxiv.org/rss/*，不同限流域），合并解析。
// 注意周末 arXiv 的 skipDays 会让部分分类 RSS 为空 channel，逐个 try 容错即可。
async function fetchArxivRssFallback(): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const cat of ARXIV_CATS) {
    const url = `https://export.arxiv.org/rss/${cat}`;
    try {
      const xml = await getTextWithRetry(url, {}, 2, 4000);
      const blocks = xml.split("<item>").slice(1).slice(0, 15);
      for (const b of blocks) {
        const block = b.split("</item>")[0];
        const link = tag(block, "link") || tag(block, "guid");
        const title = decode(tag(block, "title"));
        if (!title || !link) continue;
        const m = link.match(/abs\/(.+)$/) || link.match(/arxiv\.org\/(?:abs|pdf)\/(.+?)(?:v\d+)?$/);
        const arxivId = m ? m[1] : undefined;
        const primary = tag(block, "category") || cat;
        const desc = decode(tag(block, "description") || "");
        const abstract = desc.includes("Abstract:")
          ? desc.split("Abstract:")[1].trim()
          : desc.replace(/^arXiv:[\w.]+(v\d+)?\s*Announce Type:\s*\w+\s*/i, "");
        items.push({
          url: link,
          type: "paper",
          source: "arXiv",
          category: arxivCategoryToSlug(primary),
          title,
          summary: abstract.slice(0, 600),
          publishedAt: safeIso(tag(block, "pubDate")),
          paperFields: {
            arxivId,
            authors: [],
            domains: [primary],
            pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined,
          },
          tags: [primary.replace("cs.", "cs.")],
        } as unknown as RawItem);
      }
    } catch (e) {
      console.warn(`[arxiv] RSS 兜底 ${cat} 失败: ${e instanceof Error ? e.message : e}`);
    }
  }
  return items;
}

// arXiv via 自建 RSSHub（papers 命名空间）：
//   路由 /papers/category/arxiv/:cat （本实例把 arxiv 放在 papers 命名空间下，
//   并非官方文档里的 /arxiv/category/:cat；已实测确认正确路径）。
// 输出 <item>：<title>论文标题、<link>papers.cool/arxiv/<id>、<author>逗号分隔作者、
//   <pubDate>公告日期、<description>双重转义 HTML（[Kimi]链接 + Authors 段 + 摘要<p>）。
// 注意：该路由经 papers.cool 中转，每分类仅返回约 1 篇（上游 cap），覆盖率有限；
//       故作为主源优先尝试，覆盖率不足时由官方 API(+RSS) 兜底补充（见 fetchArxiv）。
function extractArxivAbstract(html: string): string {
  let s = html.replace(/<a[^>]*>\[Kimi\]<\/a>/gi, "");
  s = s.replace(/<p>[\s\S]*?Authors:[\s\S]*?<\/p>/i, "");
  const ps = (s.match(/<p>([\s\S]*?)<\/p>/g) || [])
    .map((p) => p.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const abstract = ps.pop() || s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return abstract.slice(0, 800);
}

async function parseArxivRssHubItem(block: string, cat: string): Promise<RawItem | null> {
  const title = decode(tag(block, "title"));
  const link = tag(block, "link");
  const guid = tag(block, "guid");
  const m = link.match(/papers\.cool\/arxiv\/([^?]+)/) || guid.match(/papers\.cool-([^<]+)/);
  const arxivId = m ? m[1].replace(/v\d+$/, "") : undefined;
  if (!title || !arxivId) return null;
  // description 为双重转义 HTML：先 decode 一次还原成真实 HTML，再抽摘要
  const descHtml = decode(tag(block, "description") || "");
  const abstract = extractArxivAbstract(descHtml);
  const authorStr = decode(tag(block, "author") || "");
  const authors = authorStr.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const pubRaw = tag(block, "pubDate");
  return {
    url: `https://arxiv.org/abs/${arxivId}`,
    type: "paper",
    source: "arXiv",
    category: arxivCategoryToSlug(cat),
    title,
    summary: abstract,
    publishedAt: safeIso(pubRaw),
    paperFields: {
      arxivId,
      authors,
      domains: [cat],
      pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    },
    tags: [cat.replace("cs.", "cs.")],
  } as unknown as RawItem;
}

async function fetchArxivRssHub(): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const cat of ARXIV_CATS) {
    try {
      const xml = await fetchRssHubRaw(`papers/category/arxiv/${cat}`);
      const blocks = xml.split("<item>").slice(1);
      for (const b of blocks) {
        const it = await parseArxivRssHubItem(b.split("</item>")[0], cat);
        if (it) items.push(it);
      }
    } catch (e) {
      console.warn(
        `[arxiv] RSSHub ${cat} 失败: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
  return items;
}

// 官方来源（原有逻辑，作为兜底 / 补充）：API 查询 4 分类最新 24 篇，
// 429 / 失败时回退 export.arxiv.org 的 RSS。
async function fetchArxivOfficial(src: Source): Promise<RawItem[]> {
  const url =
    "https://export.arxiv.org/api/query?search_query=" +
    encodeURIComponent("cat:cs.AI OR cat:cs.CL OR cat:cs.LG OR cat:cs.CV") +
    "&sortBy=submittedDate&sortOrder=descending&max_results=24";
  try {
    const xml = await getTextWithRetry(url);
    const entries = xml.split("<entry>").slice(1);
    return entries.map((e) => parseArxivApiBlock(e.split("</entry>")[0]));
  } catch (e) {
    console.warn(
      `[arxiv] 官方 API 抓取失败，回退 RSS 兜底: ${e instanceof Error ? e.message : e}`,
    );
    return await fetchArxivRssFallback();
  }
}

// arXiv 抓取入口：主源 = 自建 RSSHub（papers 命名空间），优先尝试、命中即用；
// 因 RSSHub 经 papers.cool 中转且每分类仅 ~1 篇，覆盖率远低于官方，
// 故当其为空或偏少时，用官方 API(+RSS) 补充，按 URL 去重合并，保证日报不退化。
async function fetchArxiv(src: Source): Promise<RawItem[]> {
  let items: RawItem[] = [];
  try {
    items = await fetchArxivRssHub();
    console.log(`[arxiv] RSSHub 主源返回 ${items.length} 篇`);
  } catch (e) {
    console.warn(
      `[arxiv] RSSHub 主源整体失败，转官方: ${e instanceof Error ? e.message : e}`,
    );
  }
  const ARXIV_MIN = 8;
  if (items.length === 0) {
    items = await fetchArxivOfficial(src);
  } else if (items.length < ARXIV_MIN) {
    try {
      const fb = await fetchArxivOfficial(src);
      const seen = new Set(items.map((i) => i.url));
      for (const it of fb) {
        if (!seen.has(it.url)) {
          items.push(it);
          seen.add(it.url);
        }
      }
    } catch (e) {
      console.warn(
        `[arxiv] 官方补充失败，仅用 RSSHub 的 ${items.length} 篇: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
  return items;
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

// 微博 / X(Twitter) / arXiv 统一走自建 RSSHub（本地实例），入口与 Basic Auth 凭据
// 从环境变量读取，绝不硬编码进代码/仓库：
//   RSSHUB_BASE_URL  例如 https://rsshub.hackcv.com
//   RSSHUB_USER / RSSHUB_PASS  Basic Auth 账号密码
// src.url / path 存相对路径（如 "weibo/user/1727858283"、"twitter/user/karpathy"、
// "papers/category/arxiv/cs.AI"），此处拼接 base 并追加 limit。
// 通用传输层：负责拼 URL、Basic Auth、45s 宽限、瞬时故障重试一次，并识别
// RSSHub 路由失效时返回的 200 HTML 错误页（非 RSS）以便上层触发兜底。
async function fetchRssHubRaw(path: string): Promise<string> {
  const base = process.env.RSSHUB_BASE_URL;
  if (!base) throw new Error("RSSHUB_BASE_URL 未配置，无法抓取 RSSHub 源");
  const p = path.replace(/^\/+/, "");
  const sep = p.includes("?") ? "&" : "?";
  const url = `${base.replace(/\/+$/, "")}/${p}${sep}limit=20`;
  const headers: Record<string, string> = {};
  const user = process.env.RSSHUB_USER;
  const pass = process.env.RSSHUB_PASS;
  if (user && pass) {
    headers.authorization =
      "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }
  // RSSHub 首次为某账号抓取需实时打上游（Twitter / 微博），耗时可能远超常规超时；
  // 故给 45s 宽限，并在 503 / 超时等瞬时故障时重试一次（间隔 2s，给上游冷启动留时间）。
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const xml = await getText(url, headers, 45000);
      // RSSHub 路由失效 / 实例异常时往往返回 200 的 HTML 错误页而非 RSS，
      // 必须识别出来抛错，才能触发上层兜底（否则会被当成「成功抓到 0 条」）。
      if (!/<item>|<entry>|<rss|channel/i.test(xml)) {
        throw new Error("RSSHub 返回非 RSS（路由可能失效 / 实例异常）");
      }
      return xml;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt === 0 && /timeout|HTTP 50[234]/.test(msg)) {
        console.warn(`[ingest] RSSHub 重试 ${path} (${(msg || "").slice(0, 90)})`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function fetchRssHubFeed(src: Source): Promise<RawItem[]> {
  return parseRssXml(await fetchRssHubRaw(src.url), src);
}

// 微博 via 自建 RSSHub
export async function fetchWeibo(src: Source): Promise<RawItem[]> {
  return fetchRssHubFeed(src);
}

// X(Twitter) 兜底：RSSHub 不可用时回退到 xcancel 公共实例。
// 注意：xcancel 按 TLS 指纹封锁 node 原生 fetch，故用系统 curl 拉取（与原实现一致）。
// 仅返回 1 条左右（公共实例已降级），但足以避免整源为空。
async function fetchXcancel(src: Source): Promise<RawItem[]> {
  const handle = (src.url.split("/").pop() || "").replace(/^@/, "");
  if (!handle) throw new Error(`xcancel 兜底：无法从 url 解析 handle (${src.url})`);
  const url = `https://rss.xcancel.com/${handle}/rss`;
  let stdout: string;
  try {
    const r = await execFileP("curl", [
      "-sSL",
      "--max-time",
      "25",
      // xcancel 拒收完整 Chrome UA（返回 400 "This URL only works inside an RSS client"），
      // 用简短 Mozilla UA 才能拿到 RSS。
      "-A",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      url,
    ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    stdout = r.stdout;
  } catch (e) {
    throw new Error(`xcancel 兜底拉取失败 src=${src.id}: ${e instanceof Error ? e.message : e}`);
  }
  if (!stdout || !/<item>|<entry>/.test(stdout)) {
    throw new Error(`xcancel 兜底返回空/非 RSS src=${src.id} <- ${url}`);
  }
  // xcancel 对未 whitelist 的账号只返回占位条目（title="RSS reader not yet whitelisted!"），
  // 这种占位无真实内容，必须过滤掉，避免污染库。
  const items = parseRssXml(stdout, src).filter(
    (it) => (it.title || "").trim() !== "RSS reader not yet whitelisted!",
  );
  if (items.length === 0) {
    console.warn(`[ingest] xcancel 兜底 src=${src.id} 仅返回占位内容（账号未 whitelist），视为空`);
  }
  return items;
}

// X(Twitter)：优先走自建 RSSHub；RSSHub 失败（503/超时等）时回退 xcancel 公共实例。
export async function fetchTwitter(src: Source): Promise<RawItem[]> {
  try {
    return await fetchRssHubFeed(src);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[ingest] RSSHub 失败 src=${src.id}，回退 xcancel: ${(msg || "").slice(0, 90)}`);
    return await fetchXcancel(src);
  }
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
