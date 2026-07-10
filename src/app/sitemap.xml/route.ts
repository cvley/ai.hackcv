import { SITE } from "@/lib/config";
import { ITEMS } from "@/lib/db/seed";
import { getCategories, getDailies } from "@/lib/db/repository";

function url(loc: string, lastmod?: string): string {
  const lm = lastmod ?? new Date().toISOString().slice(0, 10);
  return `  <url><loc>${loc}</loc><lastmod>${lm}</lastmod></url>`;
}

export const dynamic = "force-static";

export function GET() {
  const urls: string[] = [
    url(`${SITE.url}/`),
    url(`${SITE.url}/all`),
    url(`${SITE.url}/daily`),
    url(`${SITE.url}/daily/archive`),
    url(`${SITE.url}/about`),
    url(`${SITE.url}/agent`),
    url(`${SITE.url}/changelog`),
    url(`${SITE.url}/feedback`),
  ];

  for (const c of getCategories()) urls.push(url(`${SITE.url}/category/${c.slug}`));
  for (const d of getDailies(60)) urls.push(url(`${SITE.url}/daily/${d.date}`, d.date));
  for (const it of ITEMS) urls.push(url(it.permalink, it.updatedAt.slice(0, 10)));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600" },
  });
}
