"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Item {
  id: string;
  type: string;
  title: string;
  title_zh?: string;
  source: string;
  category: string;
  score: number;
  selected: boolean;
  publishedAt: string;
}

const TYPE_LABEL: Record<string, string> = { paper: "论文", project: "项目", news: "资讯", video: "视频" };
const TYPE_BADGE: Record<string, string> = {
  paper: "badge-paper",
  project: "badge-project",
  news: "badge-news",
  video: "badge-video",
};

export default function AdminItems() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [delId, setDelId] = useState<string | null>(null);

  async function load(query = "") {
    setLoading(true);
    const url = `/api/admin/items${query ? `?q=${encodeURIComponent(query)}` : ""}`;
    const r = await fetch(url, { credentials: "same-origin" });
    if (r.status === 401) {
      router.push("/admin/login");
      return;
    }
    const d = await r.json();
    setItems(d.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doDelete(id: string) {
    if (!confirm("确认删除该条目？此操作不可撤销。")) return;
    setDelId(id);
    const r = await fetch(`/api/admin/items/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setDelId(null);
    if (r.ok) load(q);
  }

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        内容管理（{items.length}）
      </div>
      <div className="admin-toolbar">
        <input
          className="search-input"
          style={{
            flex: 1,
            maxWidth: 360,
            padding: "9px 12px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--surface-alt)",
            color: "var(--text)",
          }}
          placeholder="搜索标题 / 标签 / 来源…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => load(q)}>
          搜索
        </button>
        <span className="spacer" />
        <Link className="btn btn-sm" href="/admin/items/new">
          ➕ 新建
        </Link>
      </div>

      {loading ? (
        <div className="admin-empty">加载中…</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">没有匹配的内容</div>
      ) : (
        <div className="admin-table">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>标题</th>
                <th>类型</th>
                <th>来源</th>
                <th>精选分</th>
                <th>精选</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="t-title" title={it.title}>
                    {it.title_zh ? `${it.title_zh} / ` : ""}
                    {it.title}
                  </td>
                  <td>
                    <span className={`badge ${TYPE_BADGE[it.type] || ""}`}>
                      {TYPE_LABEL[it.type] || it.type}
                    </span>
                  </td>
                  <td>{it.source}</td>
                  <td>
                    <span className="badge badge-score">{it.score}</span>
                  </td>
                  <td>{it.selected ? "✅" : "—"}</td>
                  <td>
                    <div className="actions">
                      <Link className="btn btn-ghost btn-sm" href={`/admin/items/${it.id}`}>
                        编辑
                      </Link>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={delId === it.id}
                        onClick={() => doDelete(it.id)}
                      >
                        {delId === it.id ? "删除中…" : "删除"}
                      </button>
                    </div>
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
