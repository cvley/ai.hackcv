"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Stats {
  totalItems: number;
  selectedItems: number;
  internalItems: number;
  papers: number;
  projects: number;
  news: number;
  videos: number;
  dailies: number;
  sources: number;
  enabledSources: number;
  topScore: number;
}
interface Cat { slug: string; label: string; type: string; description?: string; }
interface Source { id: string; name: string; type: string; category: string; enabled: boolean; }
interface Settings { siteName: string; title: string; description: string; itemsPerDay: number; }

export default function AdminHome() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setStats(d.stats);
        setCats(d.categories);
        setSources(d.sources);
        setSettings(d.settings);
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="admin-empty">加载中…</div>;
  if (!stats) return <div className="admin-empty">无法加载数据</div>;

  const cards: [string, number | string, string][] = [
    ["内容总数", stats.totalItems, "📦"],
    ["精选条目", stats.selectedItems, "⭐"],
    ["内部/待分析", stats.internalItems, "🔒"],
    ["论文", stats.papers, "📄"],
    ["开源项目", stats.projects, "💻"],
    ["行业资讯", stats.news, "📰"],
    ["AI 视频", stats.videos, "📺"],
    ["简报天数", stats.dailies, "🗓️"],
    ["已启用信源", `${stats.enabledSources}/${stats.sources}`, "🔌"],
    ["最高精选分", stats.topScore, "🔥"],
  ];

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        运营概览
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

      <div className="section-title">
        <span className="bar" />
        快捷操作
      </div>
      <div className="admin-toolbar">
        <Link className="btn" href="/admin/items/new">
          ➕ 新建条目
        </Link>
        <Link className="btn btn-ghost" href="/admin/items">
          🗂️ 管理内容
        </Link>
        <Link className="btn btn-ghost" href="/admin/dailies">
          📰 生成简报
        </Link>
      </div>

      <div className="section-title">
        <span className="bar" />
        分类体系（{cats.length}）
      </div>
      <div className="tabs">
        {cats.map((c) => (
          <span className="tag" key={c.slug} title={c.description}>
            {c.label}
          </span>
        ))}
      </div>

      <div className="section-title">
        <span className="bar" />
        信源状态
      </div>
      <div className="admin-table">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>信源</th>
              <th>类型</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.type}</td>
                <td>
                  <span className={s.enabled ? "pill pill-on" : "pill pill-off"}>
                    {s.enabled ? "启用" : "停用"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
