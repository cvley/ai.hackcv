import Link from "next/link";

export const metadata = { title: "开发者中心" };

const cards = [
  {
    k: "REST API",
    h: "公开 JSON 接口",
    p: "分页、筛选、全文搜索，返回结构化条目。适合后端集成与自定义前端。",
    href: "/agent",
    cta: "查看文档 →",
  },
  {
    k: "CLI · 热门推荐",
    h: "命令行 · 今日最火",
    p: "一条命令拿到今日最值得看的 AI 内容：hackcv hot 输出 Top N 热门推荐，直接接进脚本或终端速览。",
    href: "/cli",
    cta: "文档 →",
  },
  {
    k: "Agent 技能 · 热门推荐",
    h: "给 Claude / CodeBuddy 的 Skill",
    p: "封装公开 API 的 SKILL.md，让 Agent 直接回答「今天最火的是什么」，返回带链接的热门推荐。",
    href: "/skill",
    cta: "文档 →",
  },
  {
    k: "专题合集",
    h: "面向读者的主题追踪",
    p: "由编辑 / LLM 遴选的主题页，持续聚合某一方向的高质量内容。",
    href: "/changelog",
    cta: "敬请期待 →",
  },
];

export default function DevelopersPage() {
  return (
    <div className="prose">
      <h1>🧩 开发者中心</h1>
      <p>
        REST API、命令行、Agent 技能、专题合集——多种方式任选其一，把 hackcv 精选的
        论文 / 开源项目 / 行业资讯接进你的产品、脚本或 AI 助手。
      </p>

      <div className="dev-cards">
        {cards.map((c) => (
          <Link key={c.href + c.k} href={c.href} className="dev-card">
            <span className="dev-card-k">{c.k}</span>
            <span className="dev-card-h">{c.h}</span>
            <span className="dev-card-p">{c.p}</span>
            <span className="dev-card-cta">{c.cta}</span>
          </Link>
        ))}
      </div>

      <h2>机器可读入口</h2>
      <ul>
        <li>
          LLM 可读描述：<a href="/llms.txt">/llms.txt</a>
        </li>
        <li>
          OpenAPI 规范：<a href="/openapi.yaml">/openapi.yaml</a>
        </li>
        <li>
          RSS（精选 / 全部 / 简报 / 分类）：见页脚与各列表页
        </li>
      </ul>
    </div>
  );
}
