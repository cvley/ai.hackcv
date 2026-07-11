"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProviderStatus {
  id: string;
  label: string;
  kind: "anthropic" | "oaic";
  configured: boolean;
  ok?: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

interface TokenAgg {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  items: number;
  runs: number;
}

interface TokenStats {
  total: TokenAgg;
  today: TokenAgg;
  byDay: { date: string; totalTokens: number; items: number; runs: number }[];
  byProvider: { provider: string; totalTokens: number; items: number; runs: number }[];
}

export default function LlmStatusPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [s, t] = await Promise.all([
        fetch("/api/admin/llm/status", { credentials: "same-origin" }).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)),
        ),
        fetch("/api/admin/tokens", { credentials: "same-origin" }).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`tokens ${r.status}`)),
        ),
      ]);
      setProviders(s.providers);
      setStats(t);
      setLastChecked(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    } catch (e) {
      // 401 视为掉登录跳转；其余错误（500/网络）保留旧数据并提示，不再静默停在旧值
      const msg = String(e instanceof Error ? e.message : e);
      if (msg.includes("401")) router.push("/admin/login");
      else setError(`加载失败：${msg}`);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  useEffect(() => {
    load();
  }, [router]);

  async function recheck() {
    setChecking(true);
    await load(); // 重新检测同时刷新可用性 + token 统计 + 时间戳
  }

  if (loading) return <div className="admin-empty">加载中…</div>;
  if (!providers || !stats) return <div className="admin-empty">无法加载数据</div>;

  const cards: [string, string, string][] = [
    ["累计 Token", stats.total.totalTokens.toLocaleString(), "🔢"],
    ["累计 Prompt", stats.total.promptTokens.toLocaleString(), "📥"],
    ["累计 Completion", stats.total.completionTokens.toLocaleString(), "📤"],
    ["累计打分条目", String(stats.total.items), "🧮"],
    ["累计采集次数", String(stats.total.runs), "🏃"],
    ["今日 Token", stats.today.totalTokens.toLocaleString(), "📅"],
  ];

  return (
    <>
      {error && (
        <div
          style={{
            margin: "0 0 16px",
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fff4f4",
            color: "#c0392b",
            border: "1px solid #f3c2c2",
            fontSize: 13,
          }}
        >
          ⚠️ {error}
        </div>
      )}
      <div className="section-title">
        <span className="bar" />
        LLM 供应商可用性
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 12 }}
          onClick={recheck}
          disabled={checking}
        >
          {checking ? "检测中…" : "🔄 重新检测"}
        </button>
        {lastChecked && (
          <span style={{ marginLeft: 12, fontSize: 13, color: "#888", fontWeight: 400 }}>
            最后检测 {lastChecked}
          </span>
        )}
      </div>
      <div className="admin-table">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>供应商</th>
              <th>已配置</th>
              <th>可用性</th>
              <th>延迟</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id}>
                <td>{p.label}</td>
                <td>
                  <span className={p.configured ? "pill pill-on" : "pill pill-off"}>
                    {p.configured ? "已配置" : "未配置"}
                  </span>
                </td>
                <td>
                  {!p.configured ? (
                    "—"
                  ) : p.ok ? (
                    <span className="pill pill-on">可用</span>
                  ) : (
                    <span className="pill pill-off">不可用</span>
                  )}
                </td>
                <td>{p.latencyMs != null ? `${p.latencyMs}ms` : "—"}</td>
                <td>{p.error || (p.status != null ? `HTTP ${p.status}` : "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">
        <span className="bar" />
        Token 消耗统计
      </div>
      {stats.total.totalTokens === 0 && (
        <div
          style={{
            margin: "0 0 14px",
            padding: "10px 14px",
            borderRadius: 8,
            background: "#f6f8ff",
            color: "#5a6b8c",
            border: "1px solid #dbe3f7",
            fontSize: 13,
          }}
        >
          尚无 LLM 采集消耗记录。当前库内数据为启发式打分生成（不计费），
          配置 API Key 并重新运行采集（<code>scripts/run-ingest.ts</code>）后，此处将显示真实 token 消耗。
        </div>
      )}
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

      <div className="section-title">
        <span className="bar" />
        按供应商
      </div>
      <div className="admin-table">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>供应商</th>
              <th>Token</th>
              <th>条目</th>
              <th>次数</th>
            </tr>
          </thead>
          <tbody>
            {stats.byProvider.length === 0 ? (
              <tr>
                <td colSpan={4}>暂无消耗记录 —— 存量数据由启发式打分生成、未消耗 token；配置 Key 并重新采集后显示</td>
              </tr>
            ) : (
              stats.byProvider.map((b) => (
                <tr key={b.provider}>
                  <td>{b.provider}</td>
                  <td>{b.totalTokens.toLocaleString()}</td>
                  <td>{b.items}</td>
                  <td>{b.runs}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="section-title">
        <span className="bar" />
        按日
      </div>
      <div className="admin-table">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>日期</th>
              <th>Token</th>
              <th>条目</th>
              <th>次数</th>
            </tr>
          </thead>
          <tbody>
            {stats.byDay.length === 0 ? (
              <tr>
                <td colSpan={4}>暂无记录（尚未用 LLM 采集）</td>
              </tr>
            ) : (
              stats.byDay
                .slice()
                .reverse()
                .map((b) => (
                  <tr key={b.date}>
                    <td>{b.date}</td>
                    <td>{b.totalTokens.toLocaleString()}</td>
                    <td>{b.items}</td>
                    <td>{b.runs}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
