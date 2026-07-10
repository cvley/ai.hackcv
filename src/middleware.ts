import { NextRequest, NextResponse } from "next/server";
import { isBlockedUa, rateLimit } from "@/lib/ratelimit";
import { RATE_LIMITS } from "@/lib/config";

// 分层安全防护（重构方案 §9）：UA 黑名单 + API/RSS 限流 + 安全响应头
export const config = {
  // 跳过静态资源
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function clientIp(req: NextRequest): string {
  return req.ip ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
}

export function middleware(req: NextRequest) {
  // 1) 商业 SEO 爬虫拦截
  if (isBlockedUa(req.headers.get("user-agent"))) {
    return new NextResponse("blocked by hackcv", { status: 403 });
  }

  const path = req.nextUrl.pathname;

  // 2) API 限流
  if (path.startsWith("/api/")) {
    const ip = clientIp(req);
    const isPublic = path.startsWith("/api/public/");
    const limit = isPublic ? RATE_LIMITS.api : RATE_LIMITS.publicPage;
    if (!rateLimit(`api:${ip}`, limit)) {
      return new NextResponse("too many requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  // 3) RSS 限流（更严格）
  if (path.startsWith("/feed") || path.endsWith(".xml")) {
    const ip = clientIp(req);
    if (!rateLimit(`rss:${ip}`, RATE_LIMITS.rss)) {
      return new NextResponse("too many requests", { status: 429 });
    }
  }

  // 4) 安全响应头
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}
