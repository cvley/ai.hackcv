import { getItems } from "@/lib/db/repository";
import { buildRss } from "@/lib/rss";
import { SITE } from "@/lib/config";

export const dynamic = "force-static";

export function GET() {
  const items = getItems({ mode: "all", take: 50 }).items;
  const xml = buildRss(
    `${SITE.name} · 全部动态`,
    "hackcv 全部 AI 资讯动态（含未精选）",
    items,
    "/feed/all.xml",
  );
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=300" },
  });
}
