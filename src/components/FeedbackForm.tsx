"use client";
import { useState } from "react";

export default function FeedbackForm() {
  const [sent, setSent] = useState(false);
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return;
    // 演示：实际部署应 POST 到后端 / 工单系统
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rec" style={{ marginTop: 12 }}>
        ✅ 已收到你的反馈，感谢对 hackcv 的建议！
      </div>
    );
  }

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
        }}
      />
      <p>
        <button
          type="submit"
          style={{
            marginTop: 10,
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          提交反馈
        </button>
      </p>
    </form>
  );
}
