---
name: hackcv
description: >-
  获取 AI / 科技领域「现在最火、最值得看」的内容（论文 / 开源项目 / 科技资讯），
  返回带原文链接与精选分的规范推荐。当用户问「今天 AI 圈最火的是什么」「最近一周最热门的
  Agent 框架开源项目」「这周被讨论最多的多模态论文」「给我 Top 5 并附链接」等时效性 /
  热门 / 必读类问题时触发；也可用于按主题、类型或关键词检索 hackcv 已收录的内容。
---

# hackcv Skill

hackcv 是一个 AI / 科技热点聚合站点。本技能封装其公开 REST API，让 Agent 能直接回答
「现在最火 / 最值得看的是什么」，并带回带 permalink 的热门推荐与精选分。

所有数据来自 `https://ai.hackcv.com/api/public`，无需鉴权，返回 JSON。
限流：每 IP 60 次 / 分钟。时间统一 ISO 8601 / `YYYY-MM-DD`。

## 何时使用

- 用户要「热门 / 最火 / 最值得看 / 今日必读 / 本周精选」类内容
- 用户按主题、类型、关键词检索 AI / 科技资料
- 用户要「每日简报 / 研究简报」

## 端点速查

| 用途 | 方法 & 路径 | 关键参数 |
| --- | --- | --- |
| 当前热点 Top N | `GET /hot?take=5` | `take`（默认 5，取前 N 条） |
| 今日研究简报 | `GET /daily` | 无 |
| 指定日期简报 | `GET /daily/{YYYY-MM-DD}` | 路径日期 |
| 简报存档列表 | `GET /dailies` | 无 |
| 内容条目列表 | `GET /items` | 见下 |
| 单条详情 | `GET /items/{id}` | 路径 id |
| 全文搜索 | `GET /search?q=` | `q`、`type`、`page`、`pageSize` |
| 标签列表（含计数） | `GET /tags` | 无 |

### `/items` 查询参数

`mode`：`selected`（精选，默认）| `all`
`type`：`paper` | `project` | `news`
`since`：ISO 日期，取此后内容
`take`：返回条数
`cursor`：分页游标
`q`：关键词
`tag` / `category`：按标签 / 分类筛选

## 返回的数据模型（节选）

```jsonc
{
  "id": "string",
  "type": "paper | project | news",
  "title": "string",
  "title_zh": "string | null",
  "summary": "string",
  "url": "string",              // 原文 permalink
  "source": "string",           // 主信源
  "sources": ["string"],        // 多信源（越多越热）
  "publishedAt": "ISO8601",
  "tags": ["string"],
  "score": 0,                   // 0-100 LLM 精选分
  "selected": true,
  "projectFields": { "stars": 0, "todayStars": 0, "language": "string" }, // type=project
  "paperFields":  { "arxivId": "string", "authors": [], "domains": [] },  // type=paper
  "newsFields":   { "sourceUrls": [] }                                     // type=news
}
```

## 排序口径

`/hot` 的 hotness = **信源数 × 精选分 × 时间衰减**：信源越多、精选分越高、越新越靠前。
因此「热点」不等于「最新」，给用户的推荐应优先展示 hotness 高者。

## 工作流程

1. **判断意图**
   - 要「热门 / Top N」→ 调 `/hot?take=N`（N 通常 3-10）。
   - 要「今日 / 每日必读」→ 调 `/daily`；指定日期用 `/daily/{date}`。
   - 要「某类型 / 主题」→ 调 `/items?type=...&tag=...&mode=selected`。
   - 要「搜某关键词」→ 调 `/search?q=关键词`。
2. **取数后整理**为给用户看的清单：类型徽标、标题（中文优先 `title_zh`）、原文链接 `url`、
   信源、精选分 `score`、发布时间。可附一句为什么值得看（用 `summary` 提炼）。
3. **不要编造**链接或分数；严格使用接口返回字段。

## 示例

用户：「今天 AI 圈最火的内容是什么？给我 Top 5，附链接」

```text
→ GET https://ai.hackcv.com/api/public/hot?take=5
→ 整理为带链接的清单，按 hotness 降序，每条标注类型 / 精选分 / 信源数
```

用户：「最近一周最热门的 Agent 框架开源项目有哪些？」

```text
→ GET https://ai.hackcv.com/api/public/items?type=project&mode=selected&since=2026-07-06&take=10
→ 按 stars / score 排序，筛出 Agent / framework 相关，给出仓库链接
```

用户：「这周被讨论最多的多模态论文，挑 3 篇讲讲」

```text
→ GET https://ai.hackcv.com/api/public/items?type=paper&mode=selected&tag=多模态&since=2026-07-06&take=10
→ 取 hotness 最高的 3 篇，用 summary 讲解并附 arxiv / 原文链接
```

## 备注

- 站点公开页：`/hot`（热点）、`/daily`（每日简报）、`/llms.txt`（LLM 可读站点描述）。
- 完整 OpenAPI 规范见 `https://ai.hackcv.com/openapi.yaml`。
