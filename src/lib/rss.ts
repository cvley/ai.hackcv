import type { Item, Daily } from "./types";
import { SITE } from "./config";
import { hostnameOf, formatDateCN } from "./utils";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemToRss(it: Item): string {
  const body = [
    it.summary,
    it.recommendation ? `推荐理由：${it.recommendation}` : "",
    `信源：${it.sources.join("、")}`,
    it.projectFields ? `星标：${it.projectFields.stars}（今日 +${it.projectFields.todayStars}）` : "",
  ]
    .filter(Boolean)
    .join("<br/>");
  return `    <item>
      <title>${esc(it.title_zh ?? it.title)}</title>
      <link>${esc(it.permalink)}</link>
      <guid isPermaLink="true">${esc(it.permalink)}</guid>
      <pubDate>${new Date(it.publishedAt).toUTCString()}</pubDate>
      <category>${esc(it.source)}</category>
      <description>${esc(body)}</description>
    </item>`;
}

export function buildRss(title: string, description: string, items: Item[], path: string): string {
  const itemsXml = items.map(itemToRss).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(SITE.url + path)}</link>
    <description>${esc(description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;
}

export function buildDailyRss(dailies: Daily[]): string {
  const itemsXml = dailies
    .map((d) => {
      const total = d.stats.totalItems;
      const link = `${SITE.url}/daily/${d.date}`;
      return `    <item>
      <title>AI 研究简报 ${d.date}（${total} 条）</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${new Date(d.windowEnd).toUTCString()}</pubDate>
      <description>${esc(
        `今日头条：${d.lead?.title ?? "—"}。${formatDateCN(d.date)}共 ${total} 条，预计阅读 ${d.stats.readingTime}。`,
      )}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE.title)} · 每日研究简报</title>
    <link>${esc(SITE.url)}/daily</link>
    <description>hackcv 每日 AI 研究简报存档</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;
}
