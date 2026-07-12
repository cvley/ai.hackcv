import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { updateChangelog, deleteChangelog } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const patch: { version?: string; title?: string; items?: string[] } = {};
  if (typeof body.version === "string" && body.version.trim()) patch.version = body.version.trim();
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (Array.isArray(body.items)) {
    patch.items = body.items.map((x: unknown) => String(x)).filter((x: string) => x.length);
  }
  const entry = await updateChangelog(params.id, patch);
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await deleteChangelog(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
