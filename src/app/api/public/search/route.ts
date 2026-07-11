import { NextRequest, NextResponse } from "next/server";
import { searchItems } from "@/lib/db/repository";
import type { ItemType } from "@/lib/types";

// GET /api/public/search?q=...&type=...&page=...
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ error: "q must be at least 2 characters" }, { status: 400 });
  }
  const type = (sp.get("type") as ItemType | null) ?? undefined;
  const page = sp.get("page") ? Number(sp.get("page")) : 1;
  const pageSize = sp.get("pageSize") ? Number(sp.get("pageSize")) : 20;
  const data = await searchItems({ q, type, page, pageSize });
  return NextResponse.json(data);
}
