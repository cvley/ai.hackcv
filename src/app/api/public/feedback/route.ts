import { NextRequest, NextResponse } from "next/server";
import { createFeedback } from "@/lib/db/repository";

// POST /api/public/feedback
// 前台匿名提交反馈。中间件已对 /api/public/* 做限流，无需额外防护。
export const dynamic = "force-dynamic";

const MAX_MESSAGE = 2000;
const MAX_CONTACT = 200;
const MAX_PAGE = 200;

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 3) {
    return NextResponse.json({ error: "反馈内容太短（至少 3 个字）" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "反馈内容过长" }, { status: 400 });
  }

  const contact =
    typeof body.contact === "string" && body.contact.trim()
      ? body.contact.trim().slice(0, MAX_CONTACT)
      : null;
  const page =
    typeof body.page === "string" && body.page.trim()
      ? body.page.trim().slice(0, MAX_PAGE)
      : null;

  const entry = await createFeedback({ message, contact, page });
  return NextResponse.json({ ok: true, id: entry.id });
}
