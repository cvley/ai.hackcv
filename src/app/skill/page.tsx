export const metadata = {
  title: "hackcv Skill（AI Agent 技能）",
  description: "封装 hackcv 公开 API 的 SKILL.md，让 AI Agent 直接回答「现在最火 / 最值得看的是什么」。",
};

export default function SkillPage() {
  return (
    <div className="prose">
      <h1>🧠 hackcv Skill（AI Agent 技能）</h1>
      <p>
        一个封装了 hackcv 公开 API 的 <code>SKILL.md</code>。装到 Claude / CodeBuddy / Codex 后，
        Agent 最擅长回答<strong>「现在最火 / 最值得看的是什么」</strong>，并带回带 permalink 的热门推荐。
      </p>

      <h2>安装</h2>
      <ul>
        <li>
          <strong>市场安装（推荐，待上线）：</strong>在 CodeBuddy 专家中心 / Claude 技能市场搜索{" "}
          <code>hackcv</code> 一键安装。
        </li>
        <li>
          <strong>手动安装：</strong>复制仓库 <code>skills/hackcv/SKILL.md</code> 到 Agent 的 skills 目录即可。
        </li>
      </ul>

      <h2>核心能力（热门推荐）</h2>
      <ul>
        <li>获取<strong>今日 / 本周热门推荐</strong>（Top N，按信源数 × 分数 × 时间衰减）</li>
        <li>按类型（论文 / 项目 / 资讯）或主题筛选热门</li>
        <li>返回带 <code>permalink</code> 的规范引用与 LLM 精选分，便于按质量排序</li>
        <li>（进阶）结合 <code>/daily</code> 给出每日必读清单</li>
      </ul>

      <h2>示例 prompt</h2>
      <pre>{`# 在装好 hackcv 技能的 Agent 中
"今天 AI 圈最火的内容是什么？给我 Top 5，附链接"
"最近一周最热门的 Agent 框架开源项目有哪些？"
"这周被讨论最多的多模态论文，挑 3 篇讲讲"`}</pre>

      <p>
        热门数据同样来自站点 <code>/hot</code> 与 <code>/daily</code> 接口。读取{" "}
        <a href="/llms.txt">/llms.txt</a> 的 Agent 可直接发现并调用本技能，完整 API 见{" "}
        <a href="/agent">Agent 接入文档</a>。
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>
        注：Skill 本体（SKILL.md）与市场上架正在准备中。
      </p>
    </div>
  );
}
