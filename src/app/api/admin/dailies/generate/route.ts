import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { generateDaily } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const daily = generateDaily(body?.date || undefined);
  return NextResponse.json({ ok: true, daily });
}
