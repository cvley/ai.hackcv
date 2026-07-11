import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runIngestion } from "@/lib/ingest";

export const dynamic = "force-dynamic";

// 后台手动触发一次采集（需登录）
export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let sourceIds: string[] | undefined;
  try {
    const b = await req.json();
    sourceIds = Array.isArray(b?.sourceIds) ? b.sourceIds : undefined;
  } catch {
    /* 空 body = 全量 */
  }
  const result = await runIngestion({ sourceIds });
  return NextResponse.json({ ok: true, result });
}
