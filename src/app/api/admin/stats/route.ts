import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAdminStats, getSources, getSettings } from "@/lib/db/repository";
import { CATEGORIES } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    stats: await getAdminStats(),
    categories: CATEGORIES,
    sources: await getSources(),
    settings: await getSettings(),
    sessionUser: s.user,
  });
}
