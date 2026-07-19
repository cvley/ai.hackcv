// nginx access.log（combined 格式）解析与分析
// 默认读取 ai.hackcv 独立 access_log；可通过环境变量 HACKCV_NGINX_LOG 覆盖路径。
import { promises as fs } from "fs";
import { ipCity } from "./geoip";

export const NGINX_LOG_PATH =
  process.env.HACKCV_NGINX_LOG || "/var/log/nginx/ai.hackcv.access.log";

// 多站点日志路径：ai 子站 / hackcv.com 主站
export type LogSite = "ai" | "main";
export const LOG_PATHS: Record<LogSite, string> = {
  ai: process.env.HACKCV_NGINX_LOG_AI || "/var/log/nginx/ai.hackcv.access.log",
  main: process.env.HACKCV_NGINX_LOG_MAIN || "/var/log/nginx/hackcv.access.log",
};
export function logPath(site: LogSite = "ai"): string {
  return LOG_PATHS[site] || LOG_PATHS.ai;
}

// combined: $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
const LINE_RE =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/;

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// "13/Jul/2026:23:48:39 +0800" -> Date
function parseTime(s: string): Date | null {
  const m = s.match(
    /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})/,
  );
  if (!m) return null;
  const [, d, mon, y, h, mi, se, tz] = m;
  const mo = MONTHS[mon];
  if (mo === undefined) return null;
  // 构造带时区偏移的 Date
  const sign = tz[0] === "-" ? -1 : 1;
  const offMin = sign * (parseInt(tz.slice(1, 3), 10) * 60 + parseInt(tz.slice(3, 5), 10));
  const utc = Date.UTC(+y, mo, +d, +h, +mi, +se) - offMin * 60_000;
  return new Date(utc);
}

export interface ParsedLine {
  ip: string;
  time: Date | null;
  method: string;
  path: string;
  proto: string;
  status: string;
  bytes: number;
  referer: string;
  ua: string;
}

export function parseLine(line: string): ParsedLine | null {
  const m = line.match(LINE_RE);
  if (!m) return null;
  const [, ip, ts, req, status, bytes, referer, ua] = m;
  const parts = req.split(" ");
  const method = parts[0] || "-";
  const path = parts[1] || "-";
  const proto = parts[2] || "-";
  return {
    ip,
    time: parseTime(ts),
    method,
    path,
    proto,
    status,
    bytes: bytes === "-" ? 0 : Number(bytes),
    referer: referer === "-" ? "" : referer,
    ua,
  };
}

function cleanPath(p: string): string {
  try {
    return decodeURIComponent(p.split("?")[0].split("#")[0]);
  } catch {
    return p.split("?")[0];
  }
}

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|twitterbot|googlebot|baiduspider|semrush|ahrefs|mj12|yandex|petalbot|bytespider|claudebot|gptbot|chatgpt/i;
const BROWSER_RE = /Mozilla|Chrome|Safari|Firefox|Edge|OPR\/|Opera|CriOS/i;

export interface TopItem {
  key: string;
  count: number;
  city?: string; // IP 地理定位（仅 topIps 使用）：省/市
}

export interface HourBucket {
  hour: string; // "MM-DD HH:00"
  count: number;
}

export interface LogStats {
  available: boolean;
  path: string;
  total: number;
  parsed: number;
  uniqueIps: number;
  totalBytes: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  byHour: HourBucket[];
  topPaths: TopItem[];
  topIps: TopItem[];
  topReferers: TopItem[];
  notFound: TopItem[];
  uaBots: number;
  uaBrowsers: number;
  uaOther: number;
  windowStart: string | null;
  windowEnd: string | null;
  sampleErrors: string[];
}

function topN(map: Map<string, number>, n: number): TopItem[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function analyze(rawLines: string[], top = 20): LogStats {
  let parsed = 0;
  let totalBytes = 0;
  const byStatus: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  const pathMap = new Map<string, number>();
  const ipMap = new Map<string, number>();
  const refMap = new Map<string, number>();
  const nfMap = new Map<string, number>();
  const hourMap = new Map<string, number>();
  let uaBots = 0, uaBrowsers = 0, uaOther = 0;
  let minT: number | null = null;
  let maxT: number | null = null;
  const sampleErrors: string[] = [];

  for (const line of rawLines) {
    const p = parseLine(line);
    if (!p) {
      if (line.trim() && sampleErrors.length < 3) sampleErrors.push(line.slice(0, 200));
      continue;
    }
    parsed++;
    totalBytes += p.bytes;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    byMethod[p.method] = (byMethod[p.method] || 0) + 1;

    const cp = cleanPath(p.path);
    pathMap.set(cp, (pathMap.get(cp) || 0) + 1);
    ipMap.set(p.ip, (ipMap.get(p.ip) || 0) + 1);
    if (p.referer) refMap.set(p.referer, (refMap.get(p.referer) || 0) + 1);
    if (p.status === "404") nfMap.set(cp, (nfMap.get(cp) || 0) + 1);

    if (BOT_RE.test(p.ua)) uaBots++;
    else if (BROWSER_RE.test(p.ua)) uaBrowsers++;
    else uaOther++;

    if (p.time) {
      const t = p.time.getTime();
      if (minT === null || t < minT) minT = t;
      if (maxT === null || t > maxT) maxT = t;
      const d = p.time;
      const pad = (n: number) => String(n).padStart(2, "0");
      const hb = `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
      hourMap.set(hb, (hourMap.get(hb) || 0) + 1);
    }
  }

  // 近 24h 桶补全（以最新时间结尾）
  const byHour: HourBucket[] = [];
  if (maxT !== null) {
    const end = new Date(maxT);
    end.setMinutes(0, 0, 0);
    for (let i = 23; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 3_600_000);
      const pad = (n: number) => String(n).padStart(2, "0");
      const hb = `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
      byHour.push({ hour: hb, count: hourMap.get(hb) || 0 });
    }
  }

  const topIps: TopItem[] = topN(ipMap, top).map((t) => ({
    ...t,
    city: ipCity(t.key),
  }));

  return {
    available: true,
    path: NGINX_LOG_PATH,
    total: rawLines.length,
    parsed,
    uniqueIps: ipMap.size,
    totalBytes,
    byStatus,
    byMethod,
    byHour,
    topPaths: topN(pathMap, top),
    topIps,
    topReferers: topN(refMap, top),
    notFound: topN(nfMap, top),
    uaBots,
    uaBrowsers,
    uaOther,
    windowStart: minT !== null ? new Date(minT).toISOString() : null,
    windowEnd: maxT !== null ? new Date(maxT).toISOString() : null,
    sampleErrors,
  };
}

export async function readAndAnalyze(site: LogSite = "ai", top = 20): Promise<LogStats> {
  const path = logPath(site);
  let data: string;
  try {
    data = await fs.readFile(path, "utf8");
  } catch {
    return {
      available: false,
      path,
      total: 0,
      parsed: 0,
      uniqueIps: 0,
      totalBytes: 0,
      byStatus: {},
      byMethod: {},
      byHour: [],
      topPaths: [],
      topIps: [],
      topReferers: [],
      notFound: [],
      uaBots: 0,
      uaBrowsers: 0,
      uaOther: 0,
      windowStart: null,
      windowEnd: null,
      sampleErrors: [],
    };
  }
  const lines = data.split("\n").filter((l) => l.trim());
  const stats = analyze(lines, top);
  stats.path = path;
  return stats;
}
