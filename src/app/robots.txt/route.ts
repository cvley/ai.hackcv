import { SITE } from "@/lib/config";

const BODY = `# hackcv robots.txt（重构方案 §9.2）
# 守规 AI 检索 bot 放行公开 API
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Googlebot
User-agent: Bingbot
Allow: /api/public/

# 商业 SEO 爬虫禁止
User-agent: SemrushBot
User-agent: AhrefsBot
User-agent: MJ12bot
User-agent: DotBot
User-agent: PetalBot
User-agent: Bytespider
Disallow: /

# 通用规则
User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /opengraph-image-*
Sitemap: ${SITE.url}/sitemap.xml
`;

export const dynamic = "force-static";

export function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
