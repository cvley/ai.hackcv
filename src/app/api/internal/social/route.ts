import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getInternalSocialItems } from "@/lib/db/repository";
import { analyzeSocial } from "@/lib/social-analysis";

export const dynamic = "force-dynamic";

// 内部接口鉴权：
//   - 管理员会话（浏览器已登录 /admin）→ 放行
//   - 否则需携带内部密钥头 x-internal-secret（缺省复用 CRON_SECRET）
// 两者都未满足则 401；若连密钥都未配置则 403（禁用）。
function internalSecretOk(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const provided =
    req.headers.get("x-internal-secret") || req.headers.get("x-cron-secret");
  return provided === secret;
}

// GET /api/internal/social
//   查询参数：
//     source = all | weibo | twitter  （默认 all）
//     days   = 近 N 天（默认 7，最大 60）
//     limit  = 返回条目上限（默认 300，最大 1000）
//     analysis = 0 时仅返回原始数据，不做热点分析（默认开启）
//   返回：{ count, windowDays, source, items[], analysis? }
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session && !internalSecretOk(req)) {
    const secret = process.env.INTERNAL_API_SECRET ?? process.env.CRON_SECRET;
    return NextResponse.json(
      { error: secret ? "unauthorized" : "internal api disabled (no secret configured)" },
      { status: secret ? 401 : 403 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const sourceParam = sp.get("source");
  const sourceType =
    sourceParam === "weibo" || sourceParam === "twitter" ? sourceParam : undefined;
  const days = Math.min(Math.max(Number(sp.get("days") || 7), 1), 60);
  const limit = Math.min(Math.max(Number(sp.get("limit") || 300), 1), 1000);
  const withAnalysis = sp.get("analysis") !== "0";

  const items = await getInternalSocialItems({ sourceType, days, take: limit });
  const analysis = withAnalysis ? analyzeSocial(items, { windowDays: days }) : undefined;

  return NextResponse.json({
    count: items.length,
    windowDays: days,
    source: sourceType ?? "all",
    generatedAt: new Date().toISOString(),
    items,
    analysis,
  });
}
