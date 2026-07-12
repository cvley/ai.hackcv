import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getChangelogs, createChangelog } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ entries: await getChangelogs() });
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const version = String(body.version ?? "").trim();
  const title = String(body.title ?? "").trim();
  const items = Array.isArray(body.items)
    ? body.items.map((x: unknown) => String(x)).filter((x: string) => x.length)
    : [];
  if (!version || !title) {
    return NextResponse.json({ error: "version 和 title 必填" }, { status: 400 });
  }
  const entry = await createChangelog({ version, title, items });
  return NextResponse.json({ ok: true, entry });
}
