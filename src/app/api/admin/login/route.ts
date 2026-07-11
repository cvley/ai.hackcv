import { NextRequest, NextResponse } from "next/server";
import { authenticate, issueSession, SESSION_COOKIE, SESSION_TTL } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const user = String(body.user ?? "");
  const pass = String(body.pass ?? "");
  const ok = await authenticate(user, pass);
  if (!ok) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  const token = await issueSession(user);
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  return res;
}
