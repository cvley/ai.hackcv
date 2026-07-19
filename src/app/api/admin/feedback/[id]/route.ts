import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { updateFeedback, deleteFeedback } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["new", "read", "resolved"]);

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
    // ignore
  }
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!VALID_STATUS.has(status)) {
    return NextResponse.json({ error: "status 非法" }, { status: 400 });
  }
  const entry = await updateFeedback(params.id, { status });
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await deleteFeedback(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
