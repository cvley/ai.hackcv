"use client";

import { useEffect, useState } from "react";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  items: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminChangelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);
  const [form, setForm] = useState({ version: "", title: "", itemsText: "" });

  function resetForm() {
    setEditing(null);
    setForm({ version: "", title: "", itemsText: "" });
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/changelog", { credentials: "same-origin" });
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

  function startEdit(e: ChangelogEntry) {
    setEditing(e);
    setForm({
      version: e.version,
      title: e.title,
      itemsText: (e.items || []).join("\n"),
    });
    setMsg(null);
  }

  function parseItems(text: string): string[] {
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setMsg(null);
    const items = parseItems(form.itemsText);
    let r: Response;
    if (editing) {
      r = await fetch(`/api/admin/changelog/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ version: form.version, title: form.title, items }),
      });
    } else {
      r = await fetch("/api/admin/changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ version: form.version, title: form.title, items }),
      });
    }
    setSaving(false);
    if (r.ok) {
      setMsg({ ok: true, text: editing ? "已更新" : "已新增" });
      resetForm();
      await load();
    } else {
      const d = await r.json().catch(() => ({}));
      setMsg({ ok: false, text: d.error || "保存失败" });
    }
  }

  async function remove(id: string) {
    if (!confirm("确定删除这条更新日志？")) return;
    const r = await fetch(`/api/admin/changelog/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (r.ok) {
      if (editing && editing.id === id) resetForm();
      await load();
    } else {
      setMsg({ ok: false, text: "删除失败" });
    }
  }

  if (loading) return <div className="admin-empty">加载中…</div>;

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        更新日志
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 140 }}>版本</th>
            <th>标题</th>
            <th style={{ width: 140 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={3} className="admin-empty">
                暂无更新日志
              </td>
            </tr>
          )}
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.version}</td>
              <td className="t-title">{e.title}</td>
              <td>
                <div className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(e)}>
                    编辑
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)}>
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section-title" style={{ marginTop: 26 }}>
        <span className="bar" />
        {editing ? `编辑：${editing.version}` : "新建版本"}
      </div>

      <form className="admin-form" onSubmit={save}>
        {msg && <div className={msg.ok ? "msg msg-ok" : "msg msg-err"}>{msg.text}</div>}
        <div className="field-row">
          <div className="field">
            <label>版本（如 2026-07-12，作日期 / 排序键）</label>
            <input
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              placeholder="2026-07-12"
            />
          </div>
          <div className="field">
            <label>标题</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="本次更新主题"
            />
          </div>
        </div>
        <div className="field">
          <label>改动条目（每行一条）</label>
          <textarea
            value={form.itemsText}
            onChange={(e) => setForm({ ...form, itemsText: e.target.value })}
            placeholder={"新增 xx 功能\n修复 yy 问题"}
          />
          <span className="hint">每条占一行，保存时自动按行拆分</span>
        </div>
        <div className="admin-toolbar">
          <button className="btn" disabled={saving}>
            {saving ? "保存中…" : editing ? "保存修改" : "新增版本"}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
              取消编辑
            </button>
          )}
        </div>
      </form>
    </>
  );
}
