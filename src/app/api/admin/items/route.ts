import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getItems, createItem, type ItemInput } from "@/lib/db/repository";
import { scoreItem } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || undefined;
  const type = (sp.get("type") as ItemInput["type"] | null) || undefined;
  const category = sp.get("category") || undefined;
  const take = Number(sp.get("take") || 200);
  // 后台使用 mode=all 返回全部（含未精选）
  const res = await getItems({
    mode: "all",
    q,
    type,
    category,
    take: Math.min(Math.max(take, 1), 500),
  });
  return NextResponse.json({ count: res.count, items: res.items });
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Partial<ItemInput> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.title || !body.url || !body.source || !body.category || !body.type) {
    return NextResponse.json(
      { error: "缺少必填字段：title / url / source / category / type" },
      { status: 400 },
    );
  }
  const scored = await scoreItem(body as Partial<import("@/lib/types").Item>);
  const created = await createItem({
    ...(body as ItemInput),
    score: scored.score,
    summary: (body.summary as string) || scored.summary || "",
    title_zh: (body.title_zh as string) || scored.title_zh,
    tags: body.tags && Array.isArray(body.tags) && body.tags.length ? body.tags : (scored.tags || []),
  } as ItemInput);
  return NextResponse.json({ ok: true, item: created }, { status: 201 });
}
