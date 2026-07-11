import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getTokenStats } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

// 后台：LLM token 消耗统计（累计 / 今日 / 按日 / 按供应商）
export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getTokenStats());
}
