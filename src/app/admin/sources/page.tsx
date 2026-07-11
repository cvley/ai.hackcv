"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Source {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
  enabled: boolean;
  lastFetch?: string;
  fetchInterval: number;
}

export default function AdminSources() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/sources", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setSources(d.sources || []))
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(s: Source) {
    setSaving(s.id);
    const r = await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    });
    setSaving(null);
    if (r.ok) {
      setSources((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, enabled: !s.enabled } : x)),
      );
    }
  }

  async function ingest() {
    setIngesting(true);
    setMsg("抓取中...");
    try {
      const r = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (r.ok && d.result) {
        const res = d.result;
        setMsg(
          `抓取完成：拉取 ${res.totalFetched} 条，新增 ${res.totalCreated} 条，跳过重复 ${res.totalSkipped} 条`,
        );
        setSources((prev) =>
          prev.map((x) =>
            res.bySource[x.id] ? { ...x, lastFetch: new Date().toISOString() } : x,
          ),
        );
      } else {
        setMsg("抓取失败：" + (d.error || ""));
      }
    } catch {
      setMsg("抓取失败");
    } finally {
      setIngesting(false);
    }
  }

  if (loading) return <div className="admin-empty">加载中...</div>;
  return (
    <>
      <div className="section-title">
        <span className="bar" />
        信源配置（{sources.filter((s) => s.enabled).length}/{sources.length} 启用）
      </div>
      <div className="admin-toolbar">
        <button className="btn" onClick={ingest} disabled={ingesting}>
          {ingesting ? "抓取中..." : "立即抓取全部信源"}
        </button>
        {msg && <span className="msg msg-ok" style={{ marginBottom: 0 }}>{msg}</span>}
      </div>
      <div className="admin-table">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>信源</th>
              <th>类型</th>
              <th>抓取分类</th>
              <th>地址</th>
              <th>最近抓取</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.type}</td>
                <td>{s.category}</td>
                <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontSize: 12 }}>
                    {s.url}
                  </a>
                </td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>
                  {s.lastFetch ? new Date(s.lastFetch).toLocaleString("zh-CN") : "未抓取"}
                </td>
                <td>
                  <label className="switch" title={saving === s.id ? "保存中..." : "点击切换启用"}>
                    <input type="checkbox" checked={s.enabled} onChange={() => toggle(s)} />
                    <span className="slider" />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
