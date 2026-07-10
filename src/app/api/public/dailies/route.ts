import { NextRequest, NextResponse } from "next/server";
import { getDailies } from "@/lib/db/repository";

// GET /api/public/dailies —— 简报列表（存档）
export async function GET(req: NextRequest) {
  const take = req.nextUrl.searchParams.get("take")
    ? Number(req.nextUrl.searchParams.get("take"))
    : 30;
  const dailies = getDailies(take);
  return NextResponse.json({ count: dailies.length, dailies });
}
