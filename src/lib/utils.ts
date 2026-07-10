import type { ItemType } from "./types";
import { SITE } from "./config";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// 2026-07-10T08:00:00Z -> 07-10 08:00
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 2026-07-10 -> 7月10日
export function formatDateCN(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}月${d}日`;
}

export function typeLabel(type: ItemType): string {
  return SITE.typeLabels[type] ?? type;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// 数字友好显示：35500 -> 35.5k
export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

// 估算阅读时间（分钟）
export function readingMinutes(text: string): number {
  const cn = (text.match(/[一-龥]/g) || []).length;
  const en = (text.match(/[a-zA-Z]+/g) || []).length;
  return Math.max(1, Math.round(cn / 350 + en / 200));
}
