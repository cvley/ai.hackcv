import { SITE } from "@/lib/config";

const TXT = `# hackcv

> ${SITE.description}

hackcv 是实时 AI 资讯聚合平台，每天从 arXiv、GitHub、Hacker News 与多家中文
科技媒体采集内容，由 LLM 自动摘要、分类与精选打分。站点对人与 AI Agent 同时开放。

## 面向 Agent 的接入方式

所有公开数据均通过 REST API 提供（Base: ${SITE.url}/api/public）：

- GET /items?mode=selected&take=10      最新精选条目
- GET /items/{id}                         单条详情
- GET /daily                               今日研究简报（论文/项目/资讯三大板块）
- GET /daily/{YYYY-MM-DD}                指定日期简报
- GET /dailies                           简报存档
- GET /hot?take=5                       当前热点
- GET /search?q=关键词                   全文搜索
- GET /tags                              标签列表
- GET /img-proxy?u=&mode=&exp=&sig=   图片代理（HMAC 签名）

返回均为 JSON。限流 60 次/分钟/IP。守规 AI 爬虫（GPTBot、ClaudeBot、PerplexityBot）
已被 robots.txt 明确放行访问 /api/public/。

## 内容类型

- paper   : arXiv 最新 AI 论文（含领域、作者、PDF）
- project : GitHub 热门开源项目（含星标、语言、协议）
- news    : 全球 AI 行业资讯（多信源归组）

每条内容包含：标题、中文翻译、摘要、推荐理由、信源列表、精选分数(0-100)、标签与时间。

## 热门推荐（推荐给 Agent 的首选能力）

想知道「现在 AI 圈最火 / 最值得看的是什么」，直接调用热点接口：

- GET /hot?take=10                     今日热门推荐（排序 = 信源数 × 精选分 × 时间衰减）
- GET /hot?take=10&type=paper          按类型：paper / project / news
- GET /daily                           每日必读简报（论文/项目/资讯）

## CLI 与 Agent 技能

- CLI（命令行）：${SITE.url}/cli —— 安装 npm i -g hackcv，主命令 hackcv hot 一键获取今日热门推荐。
- Skill（AI Agent 技能）：${SITE.url}/skill —— 封装本 API 的 SKILL.md，装到 Claude / CodeBuddy / Codex 后可直接返回带 permalink 的热门推荐。
- 开发者中心：${SITE.url}/developers
`;

export const dynamic = "force-static";

export function GET() {
  return new Response(TXT, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
