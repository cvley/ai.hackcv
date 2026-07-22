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

// ---- 内容清洗：解码 HTML 实体 + 去除 HTML 标签 + 折叠空白 ----
// 解决 DB 中残留的 &#8217; / &rsquo; / &nbsp; 等原始实体，以及 <p></p> / <h2> 等
// HTML 标签被 React 当纯文本原样显示的问题（首页卡片 / 详情页 / 简报 / 搜索共用）。

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ", hellip: "…", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", middot: "·", bull: "•",
  copy: "©", reg: "®", trade: "™", deg: "°",
  times: "×", plusmn: "±", divide: "÷", frac12: "½",
  aelig: "æ", agrave: "à", aacute: "á", acirc: "â",
  eacute: "é", egrave: "è", ecirc: "ê", ccedil: "ç",
  ouml: "ö", uuml: "ü", ntilde: "ñ", szlig: "ß",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ",
  pi: "π", sigma: "σ", mu: "μ", omega: "Ω",
  rarr: "→", larr: "←", uarr: "↑", darr: "↓", harr: "↔",
  infin: "∞", ne: "≠", le: "≤", ge: "≥",
  sect: "§", para: "¶",
};

function safeCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return "";
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

/** 把 HTML 实体解码为真实字符（数值 / 十六进制 / 命名，可嵌套如 &amp;lt;）。 */
export function decodeEntities(input: string): string {
  let out = input;
  for (let i = 0; i < 4; i++) {
    const next = out
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
      .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * 清洗用户可见文本：
 *  1. 解码 HTML 实体（&#8217; → ’）
 *  2. 去除 HTML 标签（含空 <p></p>），标签处补空格避免中英黏连
 *  3. 折叠所有空白（含换行 / 全角空格 / nbsp）为单空格并 trim
 */
export function cleanText(input: string | null | undefined): string {
  if (input == null) return "";
  let s = decodeEntities(input);
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, " ");
  s = decodeEntities(s); // 标签内可能包裹实体
  s = s.replace(/[\s \u00A0\u3000]+/g, " ").trim();
  return s;
}
