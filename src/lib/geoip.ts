// IP → 城市（省/市）地理定位，基于 ip2region 本地离线库（随 npm 包自带 .db，无外网依赖）。
// 仅服务端使用：nginx-log.ts 解析访问日志时调用，把 Top IP 富化成"省份 城市"。
import IP2Region from "ip2region";
import type { IP2RegionResult } from "ip2region";

let searcher: IP2Region | null = null;
let tried = false;
function getSearcher(): IP2Region | null {
  if (!tried) {
    tried = true;
    try {
      searcher = new IP2Region();
    } catch {
      searcher = null;
    }
  }
  return searcher;
}

// 内网/保留地址：直接返回"内网/本地"，无需查库。
const PRIVATE_V4 =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/;
function isPrivate(ip: string): boolean {
  if (ip.includes(":")) {
    return /^(::1|fc|fd|fe80)/i.test(ip);
  }
  return PRIVATE_V4.test(ip);
}

/**
 * 把 IP 转成友好的城市标签。
 * 返回 "省份 城市"（省==市去重，仅省时只显示省，国外显示国家），
 * 内网返回 "内网/本地"，查询失败/未知返回 "—"。
 */
export function ipCity(ip: string): string {
  if (!ip || ip === "anon") return "—";
  if (isPrivate(ip)) return "内网/本地";

  const q = getSearcher();
  if (!q) return "—";

  try {
    const r: IP2RegionResult | null = q.search(ip);
    if (!r) return "—";
    const prov = r.province && r.province !== "0" ? r.province : "";
    const city = r.city && r.city !== "0" ? r.city : "";
    const country = r.country && r.country !== "0" ? r.country : "";
    const uniq = [...new Set([prov, city].filter(Boolean))];
    return uniq.join(" ") || country || "—";
  } catch {
    return "—";
  }
}
