import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";
import { generateDaily } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

// 供外部定时调度（Vercel Cron / GitHub Actions / crontab）触发。
// 通过请求头 x-cron-secret 校验；未配置 CRON_SECRET 时禁用（403）。
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron disabled (CRON_SECRET not set)" }, { status: 403 });
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // ?force=1 时绕过 fetchInterval 节流，做全量补偿（用于每日兜底）
  const force = req.nextUrl.searchParams.get("force") === "1";
  const result = await runIngestion({ force });
  // 采集完立即生成/刷新「今日简报」，使 /daily 自动填充，无需后台手动触发
  const daily = await generateDaily();
  console.log(
    `[cron/ingest] force=${force} ok=${result.ok} fetched=${result.totalFetched} ` +
      `created=${result.totalCreated} skipped=${result.totalSkipped} throttled=${result.totalThrottled} ` +
      `errors=${result.errors.length} bySource=${JSON.stringify(result.bySource)}`,
  );
  if (daily) {
    const byType = Object.fromEntries(daily.sections.map((s) => [s.type, s.items.length]));
    console.log(`[cron/daily] date=${daily.date} total=${daily.stats.totalItems} byType=${JSON.stringify(byType)}`);
  } else {
    console.log(`[cron/daily] no daily generated (0 items collected today & selected)`);
  }
  return NextResponse.json({
    ok: true,
    force,
    result,
    daily: daily ? { date: daily.date, totalItems: daily.stats.totalItems } : null,
  });
}

// 便于外部健康检查
export async function GET() {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, cron: "disabled" });
  }
  return NextResponse.json({ ok: true, cron: "armed" });
}
