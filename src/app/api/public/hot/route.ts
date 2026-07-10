import { NextRequest, NextResponse } from "next/server";
import { getHot } from "@/lib/db/repository";

// GET /api/public/hot —— 当前热点（信源数 × 分数 × 时间衰减）
export async function GET(req: NextRequest) {
  const take = req.nextUrl.searchParams.get("take")
    ? Number(req.nextUrl.searchParams.get("take"))
    : 5;
  const items = getHot(take);
  return NextResponse.json({ count: items.length, items });
}
