"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/admin", label: "概览", ic: "📊" },
  { href: "/admin/items", label: "内容管理", ic: "🗂️" },
  { href: "/admin/items/new", label: "新建条目", ic: "➕" },
  { href: "/admin/dailies", label: "每日简报", ic: "📰" },
  { href: "/admin/sources", label: "信源配置", ic: "🔌" },
  { href: "/admin/llm", label: "LLM 状态", ic: "🧠" },
  { href: "/admin/settings", label: "站点设置", ic: "⚙️" },
  { href: "/", label: "查看前台", ic: "🌐" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.sessionUser ?? ""))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    router.push("/admin/login");
  }

  // 登录页不需要外壳（所有 hook 已声明，放在 return 之前即可）
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-brand">
          <span className="dot" />
          hackcv 后台
        </div>
        <nav className="admin-nav">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={pathname === n.href ? "active" : ""}
            >
              <span className="ic">{n.ic}</span>
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <h1>内容运营后台</h1>
          <span className="spacer" />
          {user && <span className="who">👤 {user}</span>}
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            退出登录
          </button>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
