import { getDailies } from "@/lib/db/repository";
import { buildDailyRss } from "@/lib/rss";

export const dynamic = "force-static";

export function GET() {
  const xml = buildDailyRss(getDailies(30));
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600" },
  });
}
