import { NextResponse } from "next/server";
import { getTags } from "@/lib/db/repository";

// GET /api/public/tags —— 标签列表（含计数）
export const dynamic = "force-dynamic";
export async function GET() {
  const tags = await getTags();
  return NextResponse.json({ count: tags.length, tags });
}
