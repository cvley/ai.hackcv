// 后台鉴权辅助：登录校验、签发会话、读取会话、路由守卫
import type { NextRequest } from "next/server";
import type { SessionPayload } from "./types";
import { verifySession, signSession } from "./auth";
import { verifyPassword, hashPassword } from "./password";
import { ADMIN_COOKIE, ADMIN_TTL } from "./session";

const ADMIN_USER = process.env.HACKCV_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.HACKCV_ADMIN_PASS || "admin123";
// 预计算默认密码哈希（登录时比对）
const ADMIN_HASH = hashPassword(ADMIN_PASS);

export async function authenticate(user: string, pass: string): Promise<boolean> {
  if (user !== ADMIN_USER) return false;
  return verifyPassword(pass, ADMIN_HASH);
}

export async function issueSession(user: string): Promise<string> {
  const payload: SessionPayload = {
    user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
  };
  return signSession(payload);
}

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  return verifySession(cookie);
}

// 在 API route 中调用；未授权返回 null，由调用方返回 401。
export async function requireAdmin(
  req: NextRequest,
): Promise<SessionPayload | null> {
  return getSession(req);
}

export const SESSION_COOKIE = ADMIN_COOKIE;
export const SESSION_TTL = ADMIN_TTL;
export const DEFAULT_ADMIN_USER = ADMIN_USER;
