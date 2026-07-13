import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { readAndAnalyze } from "@/lib/nginx-log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const top = Math.min(Math.max(Number(req.nextUrl.searchParams.get("top")) || 20, 5), 50);
  const stats = await readAndAnalyze(top);
  return NextResponse.json({ stats, sessionUser: s.user });
}
