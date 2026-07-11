"use client";

import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/db/seed";
import { useEffect, useState } from "react";

interface Item {
  id?: string;
  type: string;
  title: string;
  title_zh?: string;
  summary: string;
  recommendation?: string;
  url: string;
  source: string;
  sources?: string[];
  category: string;
  tags?: string[];
  selected: boolean;
  dailyDate?: string;
  score?: number;
}

const EMPTY: Item = {
  type: "paper",
  title: "",
  title_zh: "",
  summary: "",
  recommendation: "",
  url: "",
  source: "",
  sources: [],
  category: CATEGORIES[0]?.slug ?? "",
  tags: [],
  selected: true,
  dailyDate: "",
  score: undefined,
};

export default function ItemForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Item>(EMPTY);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/items/${id}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setForm({ ...EMPTY, ...d.item }))
      .catch(() => setMsg({ ok: false, text: "加载失败" }))
      .finally(() => setLoading(false));
  }, [id]);

  function set<K extends keyof Item>(k: K, v: Item[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const payload = {
      ...form,
      sources: (form.sources || []).map((s) => s.trim()).filter(Boolean),
      tags: (form.tags || []).map((s) => s.trim()).filter(Boolean),
      score: form.score === undefined || form.score === null || form.score === 0 ? undefined : Number(form.score),
    };
    const url = id ? `/api/admin/items/${id}` : "/api/admin/items";
    const method = id ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setMsg({ ok: false, text: d.error || "保存失败" });
      return;
    }
    setMsg({ ok: true, text: "已保存" });
    if (!id) {
      const d = await r.json();
      router.push(`/admin/items/${d.item.id}`);
      return;
    }
    router.refresh();
  }

  if (loading) return <div className="admin-empty">加载中…</div>;

  return (
    <form className="admin-form" onSubmit={submit}>
      {msg && <div className={msg.ok ? "msg msg-ok" : "msg msg-err"}>{msg.text}</div>}
      <div className="field-row">
        <div className="field">
          <label>类型 *</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="paper">论文</option>
            <option value="project">开源项目</option>
            <option value="news">行业资讯</option>
          </select>
        </div>
        <div className="field">
          <label>精选分（0-100，留空自动计算）</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.score ?? ""}
            onChange={(e) => set("score", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </div>
      </div>

      <div className="field">
        <label>标题（原文）*</label>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="field">
        <label>标题（中文）</label>
        <input value={form.title_zh ?? ""} onChange={(e) => set("title_zh", e.target.value)} />
      </div>
      <div className="field">
        <label>摘要 *</label>
        <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} required />
      </div>
      <div className="field">
        <label>推荐语 / 点评</label>
        <textarea value={form.recommendation ?? ""} onChange={(e) => set("recommendation", e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>原文链接 *</label>
          <input value={form.url} onChange={(e) => set("url", e.target.value)} required />
        </div>
        <div className="field">
          <label>主信源 *</label>
          <input value={form.source} onChange={(e) => set("source", e.target.value)} required />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>分类 *</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>所属简报日期（YYYY-MM-DD）</label>
          <input
            type="date"
            value={form.dailyDate ?? ""}
            onChange={(e) => set("dailyDate", e.target.value || undefined)}
          />
        </div>
      </div>

      <div className="field">
        <label>多信源（逗号分隔）</label>
        <input
          value={(form.sources || []).join(", ")}
          onChange={(e) => set("sources", e.target.value.split(","))}
        />
      </div>
      <div className="field">
        <label>标签（逗号分隔）</label>
        <input
          value={(form.tags || []).join(", ")}
          onChange={(e) => set("tags", e.target.value.split(","))}
        />
      </div>

      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.selected}
            onChange={(e) => set("selected", e.target.checked)}
          />
          设为精选（进入首页信息流 / 简报候选）
        </label>
      </div>

      <div className="admin-toolbar">
        <button className="btn" disabled={saving}>
          {saving ? "保存中…" : id ? "保存修改" : "创建条目"}
        </button>
        <a className="btn btn-ghost" href="/admin/items">
          取消
        </a>
      </div>
    </form>
  );
}
