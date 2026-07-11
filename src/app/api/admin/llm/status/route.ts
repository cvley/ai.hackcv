import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listProviderStatus } from "@/lib/llm";

export const dynamic = "force-dynamic";

// 后台：检测所有预设 LLM 供应商的可用性（已配置的做一次极简健康 ping）
export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const providers = await listProviderStatus();
  return NextResponse.json({ providers });
}
