import { NextRequest, NextResponse } from "next/server";
import { getItems } from "@/lib/db/repository";
import type { ItemType } from "@/lib/types";

// GET /api/public/items
// 查询参数：mode, type, since, take, cursor, q, tag, category
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = (sp.get("mode") as "selected" | "all" | null) ?? "selected";
  const type = (sp.get("type") as ItemType | null) ?? undefined;
  const since = sp.get("since") ?? undefined;
  const take = sp.get("take") ? Number(sp.get("take")) : undefined;
  const cursor = sp.get("cursor") ?? undefined;
  const q = sp.get("q") ?? undefined;
  const tag = sp.get("tag") ?? undefined;
  const category = sp.get("category") ?? undefined;

  const data = await getItems({ mode, type, since, take, cursor, q, tag, category });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
