import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="ft-grid">
          <div className="ft-brand">
            <div className="ft-logo">
              <span className="ft-logo-mark">hack</span>cv
            </div>
            <p className="ft-tagline">实时 AI 资讯聚合平台</p>
            <p className="ft-desc">
              每日精选 arXiv 论文、GitHub 开源与行业动态，由 LLM 驱动的 AI 研究简报。
            </p>
          </div>

          <nav className="ft-col">
            <h4>探索</h4>
            <Link href="/">首页</Link>
            <Link href="/about">关于</Link>
            <Link href="/redbook">AI 工具红宝书</Link>
            <Link href="/changelog">更新日志</Link>
          </nav>

          <nav className="ft-col">
            <h4>开发者</h4>
            <Link href="/developers">开发者</Link>
            <Link href="/cli">CLI</Link>
            <Link href="/skill">Skill</Link>
            <Link href="/agent">API</Link>
          </nav>

          <nav className="ft-col">
            <h4>支持</h4>
            <Link href="/feedback">反馈与纠错</Link>
            <Link href="/about#wechat">关注公众号</Link>
            <a
              href="https://github.com/cvley/ai.hackcv"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub 仓库
            </a>
          </nav>
        </div>

        <div className="ft-bottom">
          <span>
            © {new Date().getFullYear()} hackcv · 内容由 LLM 精选，仅供参考
          </span>
          <span className="ft-sou">微信搜一搜 · hackcv</span>
        </div>
      </div>
    </footer>
  );
}
