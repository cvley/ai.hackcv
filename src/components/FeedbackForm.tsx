"use client";
import { useState } from "react";

type Phase = "idle" | "sending" | "sent" | "error";

export default function FeedbackForm() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) {
      setErr("反馈内容至少 3 个字");
      return;
    }
    setPhase("sending");
    setErr("");
    try {
      const r = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), contact: contact.trim() || undefined, page: location.pathname }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "提交失败，请稍后再试");
      }
      setPhase("sent");
    } catch (e: any) {
      setErr(e?.message || "提交失败，请稍后再试");
      setPhase("error");
    }
  }

  if (phase === "sent") {
    return (
      <div className="rec" style={{ marginTop: 12 }}>
        ✅ 已收到你的反馈，感谢对 hackcv 的建议！
      </div>
    );
  }

  const sending = phase === "sending";

  return (
    <form className="prose" style={{ padding: 0, border: "none", background: "none" }} onSubmit={submit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="想反馈 bug、内容建议或合作意向？写在这里…"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 14,
          fontFamily: "inherit",
          resize: "vertical",
        }}
        disabled={sending}
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="联系方式（选填，方便回复：邮箱 / 微信）"
        style={{
          width: "100%",
          marginTop: 10,
          padding: 10,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 13,
          fontFamily: "inherit",
        }}
        disabled={sending}
      />
      {err && (
        <p style={{ color: "#dc2626", fontSize: 13, margin: "8px 0 0" }}>{err}</p>
      )}
      <p>
        <button
          type="submit"
          disabled={sending}
          style={{
            marginTop: 10,
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            fontWeight: 600,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? "提交中…" : "提交反馈"}
        </button>
      </p>
    </form>
  );
}
