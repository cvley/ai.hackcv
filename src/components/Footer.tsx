import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <p>
          hackcv · 实时 AI 资讯聚合平台 &nbsp;|&nbsp;{" "}
          <Link href="/developers">开发者</Link> · <Link href="/cli">CLI</Link> · <Link href="/skill">Skill</Link> ·{" "}
          <Link href="/agent">API</Link> ·{" "}
          <Link href="/changelog">更新日志</Link> · <Link href="/feedback">反馈</Link>
        </p>
        <p>© {new Date().getFullYear()} hackcv · 内容由 LLM 精选，仅供参考</p>
      </div>
    </footer>
  );
}
