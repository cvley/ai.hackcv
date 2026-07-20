"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", ic: "🏠", label: "首页" },
  { href: "/all", ic: "📋", label: "全部" },
  { href: "/daily", ic: "📰", label: "简报" },
  { href: "/redbook", ic: "📕", label: "红宝书" },
  { href: "/search", ic: "🔍", label: "搜索" },
  { href: "/about#wechat", ic: "💬", label: "关注" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      <div className="inner">
        {TABS.map((t) => {
          const base = t.href.split("#")[0];
          const active = base === "/" ? path === "/" : path.startsWith(base);
          return (
            <Link key={t.href} href={t.href} className={active ? "active" : ""}>
              <span className="ic">{t.ic}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
