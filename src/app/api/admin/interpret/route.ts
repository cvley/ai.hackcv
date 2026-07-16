import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getItem, getItems, updateItem } from "@/lib/db/repository";
import { interpretItem } from "@/lib/interpret";
import type { Item } from "@/lib/types";

// 论文/代码解读：单条触发 或 存量回填
//   POST /api/admin/interpret?mode=one&id=<itemId>
//   POST /api/admin/interpret?mode=backfill&limit=50
export const dynamic = "force-dynamic";

const BACKFILL_CAP = 50;

export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const mode = req.nextUrl.searchParams.get("mode") || "one";
  const limit = Math.min(
    BACKFILL_CAP,
    Number(req.nextUrl.searchParams.get("limit")) || BACKFILL_CAP,
  );

  if (mode === "one") {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    const item = await getItem(id);
    if (!item) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    if (item.type !== "paper" && item.type !== "project")
      return NextResponse.json({ ok: false, error: "only paper/project support interpret" }, { status: 400 });
    const interp = await interpretItem(item as Item);
    if (!interp) return NextResponse.json({ ok: false, error: "interpret failed" }, { status: 502 });
    await updateItem(id, { interpretation: interp } as Partial<Item>);
    return NextResponse.json({ ok: true, interpretation: interp });
  }

  // backfill：为已精选但尚无解读的 paper/project 补生成
  const papers = (await getItems({ type: "paper", hasInterpretation: false, take: limit })).items;
  const projects = (await getItems({ type: "project", hasInterpretation: false, take: limit })).items;
  const targets = [...papers, ...projects].slice(0, limit);

  let created = 0;
  const errors: string[] = [];
  for (const it of targets) {
    try {
      const interp = await interpretItem(it as Item);
      if (!interp) continue;
      await updateItem(it.id, { interpretation: interp } as Partial<Item>);
      created++;
    } catch (e) {
      errors.push(`${it.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return NextResponse.json({
    ok: true,
    mode: "backfill",
    candidates: targets.length,
    created,
    errors,
  });
}
