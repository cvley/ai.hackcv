import { NextRequest, NextResponse } from "next/server";
import { getDaily } from "@/lib/db/repository";

// GET /api/public/daily/{date}  —— 指定日期简报
export async function GET(_req: NextRequest, { params }: { params: { date: string } }) {
  const daily = await getDaily(params.date);
  if (!daily) {
    return NextResponse.json({ error: "daily not found", date: params.date }, { status: 404 });
  }
  return NextResponse.json(daily);
}
