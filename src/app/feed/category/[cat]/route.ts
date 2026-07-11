import { getItemsByCategory, getCategories } from "@/lib/db/repository";
import { buildRss } from "@/lib/rss";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { cat: string } }) {
  const cat = getCategories().find((c) => c.slug === params.cat);
  const items = await getItemsByCategory(params.cat, 50);
  const label = cat?.label ?? params.cat;
  const xml = buildRss(
    `${SITE.name} · ${label}`,
    `hackcv 分类「${label}」的 AI 资讯`,
    items,
    `/feed/category/${params.cat}`,
  );
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=300" },
  });
}
