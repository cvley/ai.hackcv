"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Settings {
  siteName: string;
  title: string;
  description: string;
  itemsPerDay: number;
}

export default function AdminSettings() {
  const router = useRouter();
  const [form, setForm] = useState<Settings>({
    siteName: "",
    title: "",
    description: "",
    itemsPerDay: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setForm(d.settings || form))
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) {
      setMsg({ ok: true, text: "已保存" });
      router.refresh();
    } else {
      setMsg({ ok: false, text: "保存失败" });
    }
  }

  if (loading) return <div className="admin-empty">加载中…</div>;

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        站点设置
      </div>
      <form className="admin-form" onSubmit={save}>
        {msg && <div className={msg.ok ? "msg msg-ok" : "msg msg-err"}>{msg.text}</div>}
        <div className="field">
          <label>站点名称</label>
          <input
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
          />
        </div>
        <div className="field">
          <label>页面标题（title）</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="field">
          <label>站点描述（meta description）</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="field">
          <label>每日简报精选条目上限</label>
          <input
            type="number"
            min={1}
            max={200}
            value={form.itemsPerDay}
            onChange={(e) => setForm({ ...form, itemsPerDay: Number(e.target.value) })}
          />
        </div>
        <div className="admin-toolbar">
          <button className="btn" disabled={saving}>
            {saving ? "保存中…" : "保存设置"}
          </button>
        </div>
      </form>
    </>
  );
}
