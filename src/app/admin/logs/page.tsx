"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TopItem {
  key: string;
  count: number;
}
interface HourBucket {
  hour: string;
  count: number;
}
interface LogStats {
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

function fmtBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(2)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pct(n: number, total: number): string {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

const STATUS_COLOR: Record<string, string> = {
  "2": "#16a34a",
  "3": "#2563eb",
  "4": "#d97706",
  "5": "#dc2626",
};

export default function AdminLogs() {
  const router = useRouter();
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState(20);
  const [site, setSite] = useState<"ai" | "main">("ai");

  function load(s: "ai" | "main" = site, t = top) {
    setLoading(true);
    fetch(`/api/admin/logs?top=${t}&site=${s}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setStats(d.stats);
        setSite(d.site ?? s);
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load("ai", top);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="admin-empty">加载中…</div>;
  if (!stats) return <div className="admin-empty">无法加载日志</div>;

  if (!stats.available) {
    return (
      <div className="admin-empty">
        <p>📊 日志暂不可用</p>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          服务器未配置独立 access_log，或文件 {stats.path} 不可读。
          <br />
          需在 nginx 的 ai.hackcv.com 443 server 块加：
          <code> access_log /var/log/nginx/ai.hackcv.access.log; </code>
          并 reload nginx。
        </p>
      </div>
    );
  }

  const statusRows = Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]);
  const maxHour = Math.max(1, ...stats.byHour.map((h) => h.count));
  const maxPath = Math.max(1, ...stats.topPaths.map((p) => p.count));
  const uaTotal = stats.uaBots + stats.uaBrowsers + stats.uaOther;

  const cards: [string, string | number, string][] = [
    ["请求总数", stats.parsed.toLocaleString(), "📥"],
    ["独立 IP", stats.uniqueIps.toLocaleString(), "🌍"],
    ["总流量", fmtBytes(stats.totalBytes), "💾"],
    ["404 错误", (stats.byStatus["404"] || 0).toLocaleString(), "⚠️"],
    ["爬虫请求", `${stats.uaBots} (${pct(stats.uaBots, uaTotal)})`, "🤖"],
    ["解析失败", stats.total - stats.parsed, "⚠️"],
  ];

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        Nginx 访问日志分析
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>
          {fmtTime(stats.windowStart)} ~ {fmtTime(stats.windowEnd)} · {stats.path}
        </span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={() => load(site, top)}>
          🔄 刷新
        </button>
      </div>

      <div className="logs-tabs">
        <button className={site === "ai" ? "active" : ""} onClick={() => load("ai", top)}>
          ai.hackcv.com（子站）
        </button>
        <button className={site === "main" ? "active" : ""} onClick={() => load("main", top)}>
          hackcv.com（主站）
        </button>
      </div>

      <div className="stat-grid">
        {cards.map(([l, n, ic]) => (
          <div className="stat-card" key={l}>
            <div className="n">
              {ic} {n}
            </div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      <div className="logs-grid">
        <div className="logs-panel">
          <div className="section-title" style={{ fontSize: 16 }}>
            <span className="bar" />
            状态码分布
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>状态码</th>
                <th>次数</th>
                <th>占比</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map(([code, n]) => (
                <tr key={code}>
                  <td>
                    <span
                      style={{
                        color: STATUS_COLOR[code[0]] || "var(--text)",
                        fontWeight: 700,
                      }}
                    >
                      {code}
                    </span>
                  </td>
                  <td>{n.toLocaleString()}</td>
                  <td>{pct(n, stats.parsed)}</td>
                  <td style={{ width: 120 }}>
                    <div style={{ height: 6, background: "var(--surface-alt)", borderRadius: 999 }}>
                      <div
                        style={{
                          width: pct(n, stats.parsed).replace("%", "%"),
                          height: 6,
                          background: STATUS_COLOR[code[0]] || "var(--primary)",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="logs-panel">
          <div className="section-title" style={{ fontSize: 16 }}>
            <span className="bar" />
            近 24 小时趋势
          </div>
          <div className="hour-chart">
            {stats.byHour.map((h) => (
              <div className="hour-bar" key={h.hour} title={`${h.hour} · ${h.count}`}>
                <div
                  className="hour-fill"
                  style={{ height: `${(h.count / maxHour) * 100}%` }}
                />
                <span className="hour-label">{h.hour.slice(-2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="logs-grid">
        <div className="logs-panel">
          <div className="section-title" style={{ fontSize: 16 }}>
            <span className="bar" />
            热门路径 Top {stats.topPaths.length}
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>路径</th>
                <th>次数</th>
              </tr>
            </thead>
            <tbody>
              {stats.topPaths.map((p, i) => (
                <tr key={p.key}>
                  <td>{i + 1}</td>
                  <td className="mono">{p.key}</td>
                  <td>
                    {p.count}
                    <div style={{ height: 4, background: "var(--surface-alt)", borderRadius: 999, marginTop: 3 }}>
                      <div
                        style={{
                          width: `${(p.count / maxPath) * 100}%`,
                          height: 4,
                          background: "var(--primary)",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="logs-panel">
          <div className="section-title" style={{ fontSize: 16 }}>
            <span className="bar" />
            访客 IP Top {stats.topIps.length}
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>IP</th>
                <th>次数</th>
              </tr>
            </thead>
            <tbody>
              {stats.topIps.map((p, i) => (
                <tr key={p.key}>
                  <td>{i + 1}</td>
                  <td className="mono">{p.key}</td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="logs-grid">
        <div className="logs-panel">
          <div className="section-title" style={{ fontSize: 16 }}>
            <span className="bar" />
            来源 Referer Top {stats.topReferers.length}
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>来源</th>
                <th>次数</th>
              </tr>
            </thead>
            <tbody>
              {stats.topReferers.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: "var(--muted)" }}>
                    无
                  </td>
                </tr>
              ) : (
                stats.topReferers.map((p, i) => (
                  <tr key={p.key}>
                    <td>{i + 1}</td>
                    <td className="mono" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.key}
                    </td>
                    <td>{p.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="logs-panel">
          <div className="section-title" style={{ fontSize: 16 }}>
            <span className="bar" />
            404 路径 Top {stats.notFound.length}
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>路径</th>
                <th>次数</th>
              </tr>
            </thead>
            <tbody>
              {stats.notFound.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: "var(--muted)" }}>
                    无 404 ✅
                  </td>
                </tr>
                ) : (
                stats.notFound.map((p, i) => (
                  <tr key={p.key}>
                    <td>{i + 1}</td>
                    <td className="mono">{p.key}</td>
                    <td>{p.count}</td>
                  </tr>
                ))
                )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="logs-panel" style={{ maxWidth: "100%" }}>
        <div className="section-title" style={{ fontSize: 16 }}>
          <span className="bar" />
          UA 分类
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat-card">
            <div className="n">🤖 {stats.uaBots.toLocaleString()}</div>
            <div className="l">爬虫 ({pct(stats.uaBots, uaTotal)})</div>
          </div>
          <div className="stat-card">
            <div className="n">👩‍💻 {stats.uaBrowsers.toLocaleString()}</div>
            <div className="l">浏览器 ({pct(stats.uaBrowsers, uaTotal)})</div>
          </div>
          <div className="stat-card">
            <div className="n">❓ {stats.uaOther.toLocaleString()}</div>
            <div className="l">其他 ({pct(stats.uaOther, uaTotal)})</div>
          </div>
        </div>
      </div>
    </>
  );
}
