"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v.length >= 2) router.push(`/search?q=${encodeURIComponent(v)}`);
  }
  return (
    <form className="search" onSubmit={submit} role="search">
      <span className="icon">🔍</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索论文 / 项目 / 资讯…"
        aria-label="搜索"
      />
    </form>
  );
}
