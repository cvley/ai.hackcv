import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";

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
  const result = await runIngestion();
  return NextResponse.json({ ok: true, result });
}

// 便于外部健康检查
export async function GET() {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, cron: "disabled" });
  }
  return NextResponse.json({ ok: true, cron: "armed" });
}
