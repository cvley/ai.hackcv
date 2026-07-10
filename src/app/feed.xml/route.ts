import { getItems } from "@/lib/db/repository";
import { buildRss } from "@/lib/rss";
import { SITE } from "@/lib/config";

export const dynamic = "force-static";

export function GET() {
  const items = getItems({ mode: "selected", take: 50 }).items;
  const xml = buildRss(
    `${SITE.name} · 精选`,
    "hackcv 精选 AI 资讯（论文 / 开源项目 / 行业资讯）",
    items,
    "/feed.xml",
  );
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=300" },
  });
}
