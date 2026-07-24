import Link from "next/link";
import type { Metadata } from "next";
import CodeTabs from "@/components/CodeTabs";

export const metadata: Metadata = {
  title: "hackcv Skill（AI Agent 技能）",
  description:
    "封装 hackcv 公开 API 的 SKILL.md，让 AI Agent 直接回答「现在最火 / 最值得看的是什么」。",
};

const abilities = [
  { h: "当前热点 Top N", p: "信源数 × 精选分 × 时间衰减排序" },
  { h: "研究简报", p: "今日 / 指定日期 三大板块" },
  { h: "类型 / 主题筛选", p: "paper / project / news / 标签" },
  { h: "全文搜索", p: "关键词检索，带回 score" },
];

const endpoints = [
  { use: "当前热点", path: "/hot", param: "take" },
  { use: "今日简报", path: "/daily", param: "—" },
  { use: "指定日期简报", path: "/daily/{date}", param: "YYYY-MM-DD" },
  { use: "简报存档", path: "/dailies", param: "—" },
  { use: "内容条目", path: "/items", param: "mode,type,since,take,cursor,q,tag,category" },
  { use: "全文搜索", path: "/search", param: "q,type,page,pageSize" },
  { use: "标签列表", path: "/tags", param: "—" },
];

const prompts = `今天 AI 圈最火的内容是什么？给我 Top 5，附链接
最近一周最热门的 Agent 框架开源项目有哪些？
这周被讨论最多的多模态论文，挑 3 篇讲讲`;

const sampleJson = `{
  "type": "project",
  "title_zh": "某 Agent 框架",
  "url": "https://github.com/...",
  "source": "GitHub",
  "sources": ["GitHub", "Hacker News", "Twitter"],
  "score": 92,            // LLM 精选分 0-100
  "publishedAt": "2026-07-13T09:00:00Z",
  "projectFields": { "stars": 12400, "todayStars": 320, "language": "Python" }
}`;

const links = [
  { label: "/developers", href: "/developers", note: "开发者中心" },
  { label: "/openapi.yaml", href: "/openapi.yaml", note: "OpenAPI 规范" },
  { label: "/llms.txt", href: "/llms.txt", note: "LLM 可读描述" },
  { label: "/hot", href: "/hot", note: "当前热点" },
  { label: "/daily", href: "/daily", note: "每日简报" },
];

export default function SkillPage() {
  return (
    <div className="dev">
      {/* 1 · Hero */}
      <section className="dev-hero">
        <h1>🧠 hackcv Skill</h1>
        <p>
          一个封装了 hackcv 公开 API 的 <code>SKILL.md</code>。装到 Claude / CodeBuddy /
          Codex 等支持技能的 Agent 后，它最擅长回答
          <strong>「现在最火 / 最值得看的是什么」</strong>
          ，并带回带 permalink 的热门推荐与精选分。
        </p>
        <div className="dev-chips">
          <span className="dev-chip">Claude · CodeBuddy</span>
          <span className="dev-chip">热门推荐</span>
          <span className="dev-chip">带 permalink</span>
        </div>
        <div className="dev-cta-row">
          <a className="dev-cta primary" href="#install">
            快速开始
          </a>
          <a
            className="dev-cta ghost"
            href="https://github.com/cvley/ai.hackcv/tree/main/skills/hackcv/SKILL.md"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* 2 · 安装方式 */}
      <section id="install">
        <h2 className="section-title">
          <span className="bar" />
          安装方式
        </h2>
        <div className="dev-cards">
          <div className="dev-card">
            <span className="dev-card-k">市场安装（规划中）</span>
            <span className="dev-card-h">一键安装</span>
            <span className="dev-card-p">
              在 CodeBuddy 专家中心 / Claude 技能市场搜索 hackcv 一键安装。
            </span>
            <span className="dev-card-cta">敬请期待 →</span>
          </div>
          <a
            className="dev-card"
            href="https://github.com/cvley/ai.hackcv/tree/main/skills/hackcv/SKILL.md"
          >
            <span className="dev-card-k">手动安装</span>
            <span className="dev-card-h">复制 SKILL.md</span>
            <span className="dev-card-p">
              把仓库里的 skills/hackcv/SKILL.md 复制到 Agent 的 skills 目录（如
              ~/.workbuddy/skills/hackcv/）。
            </span>
            <span className="dev-card-cta">查看文件 →</span>
          </a>
        </div>
      </section>

      {/* 3 · 核心能力 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          核心能力
        </h2>
        <div className="ability-grid">
          {abilities.map((a) => (
            <div key={a.h} className="usecase">
              <span className="uc-h">{a.h}</span>
              <span className="uc-p">{a.p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4 · 接口能力表 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          接口能力表
        </h2>
        <div className="endpoint-table skill">
          <div className="endpoint-head">
            <span>用途</span>
            <span>端点</span>
            <span>关键参数</span>
          </div>
          {endpoints.map((e) => (
            <div key={e.path} className="endpoint-row">
              <span className="ep-use">{e.use}</span>
              <span className="ep-path">{e.path}</span>
              <span className="ep-desc">{e.param}</span>
            </div>
          ))}
        </div>
        <p className="dev-lead">
          Base URL：https://ai.hackcv.com/api/public · 无需鉴权，返回 JSON ·
          限流 60 次 / 分钟 / IP
        </p>
      </section>

      {/* 5 · 示例 prompt + 典型返回 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          示例 prompt + 典型返回
        </h2>
        <div className="skill-demo">
          <div className="demo-prompts">
            <span className="uc-h">示例 prompt</span>
            <pre>
              <code>{prompts}</code>
            </pre>
          </div>
          <div className="demo-json">
            <span className="uc-h">典型返回</span>
            <CodeTabs samples={[{ label: "JSON", code: sampleJson }]} />
          </div>
        </div>
      </section>

      {/* 6 · 相关链接 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          相关链接
        </h2>
        <div className="link-pills">
          {links.map((m) => (
            <a key={m.href} href={m.href} className="link-pill">
              <span className="lp-label">{m.label}</span>
              <span className="lp-note">{m.note}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
