import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { readAndAnalyze, type LogSite } from "@/lib/nginx-log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const top = Math.min(Math.max(Number(req.nextUrl.searchParams.get("top")) || 20, 5), 50);
  const raw = req.nextUrl.searchParams.get("site");
  const site: LogSite = raw === "main" ? "main" : "ai";
  const stats = await readAndAnalyze(site, top);
  return NextResponse.json({ stats, site, sessionUser: s.user });
}
