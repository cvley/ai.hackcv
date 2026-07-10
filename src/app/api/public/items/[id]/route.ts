import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/lib/db/repository";

// GET /api/public/items/{id}
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = getItem(params.id);
  if (!item) {
    return NextResponse.json({ error: "item not found", id: params.id }, { status: 404 });
  }
  return NextResponse.json(item, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
