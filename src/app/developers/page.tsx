import Link from "next/link";
import type { Metadata } from "next";
import CodeTabs from "@/components/CodeTabs";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "开发者中心",
  description:
    "hackcv 开发者接入：公开 REST API、命令行 CLI、AI Agent 技能与 RSS，把 LLM 精选的 AI 论文 / 开源项目 / 行业资讯接进你的产品、脚本与 Agent。",
};

const chips = ["实时更新", "无需鉴权", "JSON · RSS · llms.txt"];

const pillars = [
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
    k: "RSS & Feeds",
    h: "机器可读订阅",
    p: "精选 / 全部 / 每日简报 / 按分类的 RSS，喂给阅读器、自动化与工作流。",
    href: "/feed.xml",
    cta: "订阅源 →",
  },
];

const endpoints = [
  { method: "GET", path: "/items", desc: "内容条目列表（mode / type / since / take / cursor / q / tag / category）", href: "/agent" },
  { method: "GET", path: "/items/{id}", desc: "单条内容详情", href: "/agent" },
  { method: "GET", path: "/daily", desc: "今日研究简报（论文 / 项目 / 资讯 三大板块）", href: "/agent" },
  { method: "GET", path: "/daily/{date}", desc: "指定日期简报（路径 YYYY-MM-DD）", href: "/agent" },
  { method: "GET", path: "/dailies", desc: "简报存档列表", href: "/agent" },
  { method: "GET", path: "/hot", desc: "当前热点 Top N（信源数 × 精选分 × 时间衰减）", href: "/agent" },
  { method: "GET", path: "/search?q=", desc: "全文搜索（type / page / pageSize）", href: "/agent" },
  { method: "GET", path: "/tags", desc: "标签列表（含计数）", href: "/agent" },
  { method: "GET", path: "/img-proxy", desc: "图片代理（HMAC 签名，防滥用）", href: "/openapi.yaml" },
];

const machineLinks = [
  { label: "/openapi.yaml", href: "/openapi.yaml", note: "OpenAPI 3.0 规范" },
  { label: "/llms.txt", href: "/llms.txt", note: "LLM 可读描述" },
  { label: "/feed.xml", href: "/feed.xml", note: "精选 RSS" },
  { label: "/feed/all.xml", href: "/feed/all.xml", note: "全部 RSS" },
  { label: "/feed/daily.xml", href: "/feed/daily.xml", note: "每日简报 RSS" },
];

const useCases = [
  { h: "每日摘要机器人", p: "cron + /hot 把热门清单定时推到群组或邮件。" },
  { h: "给 Agent 接热点", p: "用 Skill 封装 API，让助手直接回答「今天最火的是什么」。" },
  { h: "内部看板", p: "拉取 /items 嵌入内部工具，做 AI 动态追踪面板。" },
];

const quickSamples = [
  {
    label: "curl",
    code: `curl "https://ai.hackcv.com/api/public/items?mode=selected&take=5"`,
  },
  {
    label: "JavaScript",
    code: `const res = await fetch(
  "https://ai.hackcv.com/api/public/items?mode=selected&take=5"
);
const data = await res.json();
console.log(data.items); // 5 条精选条目`,
  },
  {
    label: "Python",
    code: `import urllib.request, json

url = "https://ai.hackcv.com/api/public/items?mode=selected&take=5"
with urllib.request.urlopen(url) as r:
    data = json.load(r)
print([i["title"] for i in data["items"]])`,
  },
];

export default function DevelopersPage() {
  return (
    <div className="dev">
      {/* 1 · Hero */}
      <section className="dev-hero">
        <h1>🧩 开发者中心</h1>
        <p>
          把 LLM 精选的 AI 论文 / 开源项目 / 行业资讯，接进你的产品、脚本与 Agent。
          REST API、命令行、Agent 技能、RSS——多种方式任选其一。
        </p>
        <div className="dev-chips">
          {chips.map((c) => (
            <span key={c} className="dev-chip">
              {c}
            </span>
          ))}
        </div>
        <div className="dev-cta-row">
          <a className="dev-cta primary" href="#quickstart">
            快速开始
          </a>
          <a className="dev-cta ghost" href="/openapi.yaml">
            OpenAPI
          </a>
        </div>
      </section>

      {/* 2 · 快速开始 */}
      <section id="quickstart">
        <h2 className="section-title">
          <span className="bar" />
          快速开始
        </h2>
        <p className="dev-lead">一行命令拿到今日 5 条精选，无需鉴权，返回 JSON。</p>
        <CodeTabs
          samples={quickSamples}
          note="Base URL：https://ai.hackcv.com/api/public · 限流 60 次 / 分钟 / IP"
        />
      </section>

      {/* 3 · 四大接入方式 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          四种接入方式
        </h2>
        <div className="dev-cards">
          {pillars.map((c) => (
            <Link key={c.href + c.k} href={c.href} className="dev-card">
              <span className="dev-card-k">{c.k}</span>
              <span className="dev-card-h">{c.h}</span>
              <span className="dev-card-p">{c.p}</span>
              <span className="dev-card-cta">{c.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4 · API 速查表 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          API 速查
        </h2>
        <div className="endpoint-table">
          <div className="endpoint-head">
            <span>方法</span>
            <span>路径</span>
            <span>说明</span>
          </div>
          {endpoints.map((e) => (
            <Link key={e.path} href={e.href} className="endpoint-row">
              <span className="ep-method">{e.method}</span>
              <span className="ep-path">{e.path}</span>
              <span className="ep-desc">{e.desc}</span>
            </Link>
          ))}
        </div>
        <p className="dev-lead">
          完整参数与数据模型见 <Link href="/agent">Agent 接入文档</Link> 与{" "}
          <Link href="/openapi.yaml">/openapi.yaml</Link>。
        </p>
      </section>

      {/* 5 · 机器可读入口 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          机器可读入口
        </h2>
        <div className="link-pills">
          {machineLinks.map((m) => (
            <a key={m.href} href={m.href} className="link-pill">
              <span className="lp-label">{m.label}</span>
              <span className="lp-note">{m.note}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 6 · 典型场景 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          典型场景
        </h2>
        <div className="usecase-grid">
          {useCases.map((u) => (
            <div key={u.h} className="usecase">
              <span className="uc-h">{u.h}</span>
              <span className="uc-p">{u.p}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
