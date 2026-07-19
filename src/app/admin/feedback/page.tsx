"use client";

import { useEffect, useMemo, useState } from "react";

interface FeedbackEntry {
  id: string;
  message: string;
  contact: string | null;
  page: string | null;
  status: string; // new | read | resolved
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "未读",
  read: "已读",
  resolved: "已处理",
};
const STATUS_PILL: Record<string, string> = {
  new: "pill pill-off",
  read: "pill",
  resolved: "pill pill-on",
};

function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminFeedback() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "resolved">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/feedback", { credentials: "same-origin" });
      if (!r.ok) {
        if (r.status === 401) location.href = "/admin/login";
        return;
      }
      const d = await r.json();
      setEntries(d.entries || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "new") return entries.filter((e) => e.status === "new");
    return entries.filter((e) => e.status === "resolved");
  }, [entries, filter]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      new: entries.filter((e) => e.status === "new").length,
      resolved: entries.filter((e) => e.status === "resolved").length,
    }),
    [entries],
  );

  async function setStatus(id: string, status: string) {
    setBusy(id + status);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        setMsg({ ok: true, text: status === "read" ? "已标记为已读" : "已标记为已处理" });
        await load();
      } else {
        const d = await r.json().catch(() => ({}));
        setMsg({ ok: false, text: d.error || "操作失败" });
      }
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("确定删除这条反馈？")) return;
    setBusy(id + "del");
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/feedback/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (r.ok) {
        setMsg({ ok: true, text: "已删除" });
        await load();
      } else {
        setMsg({ ok: false, text: "删除失败" });
      }
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="admin-empty">加载中…</div>;

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        用户反馈
        {counts.new > 0 && (
          <span className="pill pill-off" style={{ marginLeft: 8 }}>
            {counts.new} 条未读
          </span>
        )}
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        <button
          className={filter === "all" ? "tab active" : "tab"}
          onClick={() => setFilter("all")}
        >
          全部 ({counts.all})
        </button>
        <button
          className={filter === "new" ? "tab active" : "tab"}
          onClick={() => setFilter("new")}
        >
          未读 ({counts.new})
        </button>
        <button
          className={filter === "resolved" ? "tab active" : "tab"}
          onClick={() => setFilter("resolved")}
        >
          已处理 ({counts.resolved})
        </button>
      </div>

      {msg && (
        <div className={msg.ok ? "msg msg-ok" : "msg msg-err"} style={{ marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 96 }}>状态</th>
            <th>反馈内容</th>
            <th style={{ width: 130 }}>联系方式</th>
            <th style={{ width: 130 }}>来源 / 时间</th>
            <th style={{ width: 170 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="admin-empty">
                暂无反馈
              </td>
            </tr>
          )}
          {filtered.map((e) => (
            <tr key={e.id}>
              <td>
                <span className={STATUS_PILL[e.status] || "pill"}>
                  {STATUS_LABEL[e.status] || e.status}
                </span>
              </td>
              <td className="t-title" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {e.message}
              </td>
              <td>{e.contact || <span className="muted">—</span>}</td>
              <td>
                <div className="muted" style={{ fontSize: 12 }}>
                  {e.page || "—"}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {fmt(e.createdAt)}
                </div>
              </td>
              <td>
                <div className="actions">
                  {e.status === "new" && (
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busy === e.id + "read"}
                      onClick={() => setStatus(e.id, "read")}
                    >
                      标记已读
                    </button>
                  )}
                  {e.status !== "resolved" && (
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busy === e.id + "resolved"}
                      onClick={() => setStatus(e.id, "resolved")}
                    >
                      已处理
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busy === e.id + "del"}
                    onClick={() => remove(e.id)}
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
