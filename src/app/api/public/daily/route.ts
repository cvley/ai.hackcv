import { NextResponse } from "next/server";
import { getDaily } from "@/lib/db/repository";

// GET /api/public/daily  —— 今日研究简报
export async function GET() {
  const daily = getDaily();
  if (!daily) {
    return NextResponse.json({ error: "no daily available for today" }, { status: 404 });
  }
  return NextResponse.json(daily, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
