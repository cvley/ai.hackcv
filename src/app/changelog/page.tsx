export const metadata = { title: "更新日志" };

const LOG = [
  {
    v: "2026-07-10",
    title: "重构为实时聚合平台",
    items: [
      "技术栈由 Hugo 静态站点升级为 Next.js 14 (App Router) + ISR",
      "上线 9 个公开 REST API 与 OpenAPI 规范",
      "引入 LLM 精选打分（0-100）与热点置顶",
      "新增全文搜索、标签 / 分类 / 日期多维导航",
      "新增 4 种 RSS、sitemap、robots、llms.txt",
      "四层安全防护：CDN / UA 黑名单 / 限流 / HMAC 图片代理",
    ],
  },
  {
    v: "2026-07-01",
    title: "简报结构优化",
    items: ["每日简报三大板块各增至 8 条", "论文卡片新增 PDF 下载与讨论链接"],
  },
  {
    v: "2026-06-15",
    title: "信源扩展",
    items: ["新增 Anthropic News、Papers With Code 信源", "行业资讯支持多信源归组展示"],
  },
];

export default function ChangelogPage() {
  return (
    <div className="prose">
      <h1>📝 更新日志</h1>
      {LOG.map((e) => (
        <section key={e.v}>
          <h2>
            {e.v} · {e.title}
          </h2>
          <ul>
            {e.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
