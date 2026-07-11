"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Daily {
  date: string;
  stats: { totalItems: number; readingTime: string };
}

export default function AdminDailies() {
  const router = useRouter();
  const [list, setList] = useState<Daily[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/public/dailies?take=30", { credentials: "same-origin" });
    if (r.status === 401) {
      router.push("/admin/login");
      return;
    }
    const d = await r.json();
    setList(Array.isArray(d.dailies) ? d.dailies : (Array.isArray(d) ? d : []));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/admin/dailies/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (r.ok) {
      setMsg("已生成/刷新今日简报");
      load();
    } else {
      setMsg("生成失败");
    }
  }

  async function ingest() {
    setBusy(true);
    setMsg("");
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
        load();
      } else {
        setMsg("抓取失败：" + (d.error || ""));
      }
    } catch (e) {
      setMsg("抓取失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        每日 AI 研究简报
      </div>
      <div className="admin-toolbar">
        <button className="btn" onClick={ingest} disabled={busy}>
          {busy ? "抓取中…" : "🔄 立即抓取最新内容"}
        </button>
        <button className="btn btn-ghost" onClick={generate} disabled={busy}>
          {busy ? "生成中…" : "📰 生成今日简报"}
        </button>
        {msg && <span className="msg msg-ok" style={{ marginBottom: 0 }}>{msg}</span>}
      </div>

      {loading ? (
        <div className="admin-empty">加载中…</div>
      ) : list.length === 0 ? (
        <div className="admin-empty">暂无简报，点击上方按钮生成今日简报</div>
      ) : (
        <div className="admin-table">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>日期</th>
                <th>条目数</th>
                <th>阅读时长</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{d.stats.totalItems}</td>
                  <td>{d.stats.readingTime}</td>
                  <td>
                    <Link className="btn btn-ghost btn-sm" href={`/daily/${d.date}`}>
                      查看前台
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
