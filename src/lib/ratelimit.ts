// 内存限流 + UA 黑名单（Edge 运行时安全，不依赖 Node crypto）
// 生产环境由 nginx/EdgeOne 分层限流承担，此处为本地兜底。

interface Bucket {
  count: number;
  resetAt: number;
}
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
export const BLOCKED_UA = [
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "petalbot",
  "bytespider",
];

export function isBlockedUa(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const low = ua.toLowerCase();
  return BLOCKED_UA.some((b) => low.includes(b));
}
