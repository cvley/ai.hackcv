import { headers } from "next/headers";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

function buildRobots(): string {
  // 单应用同时服务 hackcv.com 与 ai.hackcv.com。
  // 按请求域名自引用 sitemap，避免跨域 sitemap 错配（重构方案 §9.2 修复）。
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const base = host ? `${proto}://${host}` : SITE.url;

  return `# hackcv robots.txt（重构方案 §9.2）
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
Sitemap: ${base}/sitemap.xml
`;
}

export function GET() {
  return new Response(buildRobots(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
