import crypto from "crypto";
import { IMG_PROXY_SECRET } from "./config";

// ---- HMAC 图片代理签名（重构方案 §9.1 / §13 优点12）----
// 签名参数：u(目标URL) mode exp(过期时间戳) sig
export function signImageUrl(u: string, mode = "webp", ttlSeconds = 3600): { url: string; exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto
    .createHmac("sha256", IMG_PROXY_SECRET)
    .update(`${u}|${mode}|${exp}`)
    .digest("hex");
  return { url: u, exp, sig };
}

export function verifyImageSig(u: string, mode: string, exp: number, sig: string): boolean {
  if (!u || !sig || !Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false; // 过期
  const expected = crypto
    .createHmac("sha256", IMG_PROXY_SECRET)
    .update(`${u}|${mode}|${exp}`)
    .digest("hex");
  // 定长比较，防时序攻击
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---- 内存限流（演示用；生产由 nginx/EdgeOne 分层限流承担）----
interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

// 商业 SEO 爬虫 UA 黑名单（重构方案 §9.2）
export const BLOCKED_UA = ["semrushbot", "ahrefsbot", "mj12bot", "dotbot", "petalbot", "bytespider"];

export function isBlockedUa(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const low = ua.toLowerCase();
  return BLOCKED_UA.some((b) => low.includes(b));
}

// 守规 AI 爬虫：明确放行 /api/public/
export const ALLOWED_AI_BOTS = ["gptbot", "claudebot", "perplexitybot", "googlebot", "bingbot"];
