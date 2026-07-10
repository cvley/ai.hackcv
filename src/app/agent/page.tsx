export const metadata = { title: "Agent 接入" };

export default function AgentPage() {
  return (
    <div className="prose">
      <h1>🤖 Agent 接入文档</h1>
      <p>
        hackcv 提供完整的公开 REST API（<code>/api/public/</code>），可被 AI Agent、
        第三方应用与守规爬虫直接调用。所有接口返回 JSON，支持分页、筛选与全文搜索。
      </p>

      <h2>基线说明</h2>
      <ul>
        <li>Base URL：<code>https://hackcv.com/api/public</code></li>
        <li>限流：每个 IP 60 次 / 分钟（RSS 30 次 / 分钟）</li>
        <li>守规 AI 爬虫（GPTBot / ClaudeBot / PerplexityBot）已被 robots.txt 明确放行</li>
        <li>时间与日期统一使用 ISO 8601 / <code>YYYY-MM-DD</code></li>
      </ul>

      <h2>端点一览</h2>
      <pre>{`GET /items           内容条目列表（mode, type, since, take, cursor, q, tag, category）
GET /items/{id}     单条内容详情
GET /daily           今日研究简报（论文/项目/资讯 三大板块）
GET /daily/{date}   指定日期简报
GET /dailies        简报存档列表
GET /hot             当前热点（信源数 × 分数 × 时间衰减）
GET /search?q=      全文搜索（type, page, pageSize）
GET /tags            标签列表（含计数）
GET /img-proxy       图片代理（HMAC 签名，防滥用）`}</pre>

      <h2>示例：获取今日精选</h2>
      <pre>{`curl https://hackcv.com/api/public/items?mode=selected&take=10

# 指定日期简报
curl https://hackcv.com/api/public/daily/2026-07-10

# 搜索「大模型」
curl "https://hackcv.com/api/public/search?q=大模型"`}</pre>

      <h2>数据模型（节选）</h2>
      <pre>{`Item {
  id, type(paper|project|news), title, title_zh?, summary,
  url, source, sources[], publishedAt, tags[],
  score(0-100 精选分), selected,
  projectFields?{stars,todayStars,language,...},
  paperFields?{arxivId,authors,domains,...},
  newsFields?{sourceUrls[]}
}`}</pre>

      <h2>更多</h2>
      <ul>
        <li>
          完整规范：<a href="/openapi.yaml">/openapi.yaml</a>
        </li>
        <li>
          LLM 可读描述：<a href="/llms.txt">/llms.txt</a>
        </li>
        <li>
          RSS（精选 / 全部 / 简报 / 分类）：见页脚与各列表页
        </li>
      </ul>
    </div>
  );
}
