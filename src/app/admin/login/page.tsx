"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import Logo from "@/components/Logo";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/admin";
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ user, pass }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error || "登录失败");
        setBusy(false);
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setErr("网络错误，请重试");
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <Logo size={20} className="logo" />
          hackcv
        </div>
        <div className="sub">内容运营后台 · 请登录</div>
        {err && <div className="msg msg-err">{err}</div>}
        <div className="field">
          <label>用户名</label>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label>密码</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            required
          />
          <span className="hint">默认账号 admin / admin123（生产请用环境变量覆盖）</span>
        </div>
        <button className="btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "登录中…" : "登录"}
        </button>
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--muted)", fontSize: 13 }}>
            ← 返回前台
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-wrap">加载中…</div>}>
      <LoginInner />
    </Suspense>
  );
}
