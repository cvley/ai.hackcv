import { NextRequest, NextResponse } from "next/server";
import { getUnnotifiedFeedbacks, markFeedbackNotified } from "@/lib/db/repository";
import { buildFeedbackCard, postFeishuCard } from "@/lib/feishu";

export const dynamic = "force-dynamic";

// 供外部定时调度（crontab / GitHub Actions）触发。
// x-cron-secret 校验；未配置 CRON_SECRET 时禁用（403）。
// 把未推送飞书的用户反馈汇总成卡片推到飞书群机器人（FEISHU_FEEDBACK_WEBHOOK）。
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron disabled (CRON_SECRET not set)" }, { status: 403 });
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const webhook = process.env.FEISHU_FEEDBACK_WEBHOOK;
  if (!webhook) {
    return NextResponse.json({ ok: true, skipped: true, reason: "FEISHU_FEEDBACK_WEBHOOK not set" });
  }

  const items = await getUnnotifiedFeedbacks(50);
  if (items.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const siteUrl = process.env.SITE_URL || "https://ai.hackcv.com";
  const card = buildFeedbackCard(items, {
    siteUrl,
    date: new Date().toISOString().slice(0, 10),
  });

  const res = await postFeishuCard(
    webhook,
    process.env.FEISHU_FEEDBACK_SECRET || undefined,
    card,
  );
  if (!res.ok) {
    console.error(`[cron/feedback] send failed: ${res.error}`);
    return NextResponse.json({ ok: false, sent: 0, error: res.error }, { status: 502 });
  }

  const n = await markFeedbackNotified(items.map((i) => i.id));
  console.log(`[cron/feedback] sent=${items.length} marked=${n}`);
  return NextResponse.json({ ok: true, sent: items.length, marked: n });
}

// 便于外部健康检查
export async function GET() {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, cron: "disabled" });
  }
  return NextResponse.json({ ok: true, cron: "armed" });
}
