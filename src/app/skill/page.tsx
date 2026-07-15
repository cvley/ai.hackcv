export const metadata = {
  title: "hackcv Skill（AI Agent 技能）",
  description: "封装 hackcv 公开 API 的 SKILL.md，让 AI Agent 直接回答「现在最火 / 最值得看的是什么」。",
};

export default function SkillPage() {
  return (
    <div className="prose">
      <h1>🧠 hackcv Skill（AI Agent 技能）</h1>
      <p>
        一个封装了 hackcv 公开 API 的 <code>SKILL.md</code>。装到 Claude / CodeBuddy / Codex 等支持技能的
        Agent 后，它最擅长回答<strong>「现在最火 / 最值得看的是什么」</strong>，并带回带 permalink 的热门推荐与精选分。
      </p>

      <h2>安装</h2>
      <ol>
        <li>
          <strong>市场安装（规划中）：</strong>在 CodeBuddy 专家中心 / Claude 技能市场搜索{" "}
          <code>hackcv</code> 一键安装。
        </li>
        <li>
          <strong>手动安装：</strong>把仓库里的{" "}
          <a href="https://github.com/cvley/ai.hackcv/tree/main/skills/hackcv/SKILL.md">
            <code>skills/hackcv/SKILL.md</code>
          </a>{" "}
          复制到 Agent 的 skills 目录即可（如 <code>~/.workbuddy/skills/hackcv/</code> 或项目级{" "}
          <code>.workbuddy/skills/hackcv/</code>）。
        </li>
      </ol>

      <h2>核心能力（热门推荐）</h2>
      <ul>
        <li><strong>当前热点 Top N</strong>：按「信源数 × 精选分 × 时间衰减」排序，回答「现在最火的是什么」。</li>
        <li><strong>今日 / 指定日期研究简报</strong>：论文 / 项目 / 资讯三大板块的每日必读清单。</li>
        <li><strong>按类型 / 主题筛选</strong>：论文（paper）、开源项目（project）、资讯（news）或标签检索。</li>
        <li><strong>全文搜索</strong>：按关键词检索已收录内容，返回带原文链接与精选分的结果。</li>
        <li>所有结果带回 <code>permalink</code> 与 <code>score</code>，便于按质量排序与规范引用。</li>
      </ul>

      <h2>接口能力表</h2>
      <table>
        <thead>
          <tr><th>用途</th><th>端点</th><th>关键参数</th></tr>
        </thead>
        <tbody>
          <tr><td>当前热点 Top N</td><td><code>GET /api/public/hot?take=5</code></td><td><code>take</code>（默认 5）</td></tr>
          <tr><td>今日研究简报</td><td><code>GET /api/public/daily</code></td><td>—</td></tr>
          <tr><td>指定日期简报</td><td><code>GET /api/public/daily/{"{date}"}</code></td><td>路径 <code>YYYY-MM-DD</code></td></tr>
          <tr><td>简报存档</td><td><code>GET /api/public/dailies</code></td><td>—</td></tr>
          <tr><td>内容条目</td><td><code>GET /api/public/items</code></td><td><code>mode,type,since,take,cursor,q,tag,category</code></td></tr>
          <tr><td>全文搜索</td><td><code>GET /api/public/search?q=</code></td><td><code>q,type,page,pageSize</code></td></tr>
          <tr><td>标签列表</td><td><code>GET /api/public/tags</code></td><td>—</td></tr>
        </tbody>
      </table>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>
        Base URL：<code>https://ai.hackcv.com/api/public</code>；无需鉴权，返回 JSON；限流 60 次 / 分钟 / IP。
      </p>

      <h2>示例 prompt</h2>
      <pre>{`# 在装好 hackcv 技能的 Agent 中
"今天 AI 圈最火的内容是什么？给我 Top 5，附链接"
"最近一周最热门的 Agent 框架开源项目有哪些？"
"这周被讨论最多的多模态论文，挑 3 篇讲讲"`}</pre>

      <h2>典型返回（节选）</h2>
      <pre>{`{
  "type": "project",
  "title_zh": "某 Agent 框架",
  "url": "https://github.com/...",
  "source": "GitHub",
  "sources": ["GitHub", "Hacker News", "Twitter"],
  "score": 92,            // LLM 精选分 0-100
  "publishedAt": "2026-07-13T09:00:00Z",
  "projectFields": { "stars": 12400, "todayStars": 320, "language": "Python" }
}`}</pre>

      <p>
        热门数据同样来自站点 <a href="/hot">/hot</a> 与 <a href="/daily">/daily</a> 接口。
        读取 <a href="/llms.txt">/llms.txt</a> 的 Agent 可直接发现并调用本技能，
        完整 API 见 <a href="/agent">Agent 接入文档</a> 与{" "}
        <a href="/openapi.yaml">/openapi.yaml</a>。
      </p>
    </div>
  );
}
