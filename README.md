# hackcv

实时 AI 资讯聚合平台 —— 参考 [AI HOT](https://aihot.virxact.com) 架构重构方案的实现。

> 技术栈：Next.js 14 (App Router) · TypeScript · ISR · 9 个公开 REST API · 4 种 RSS · 四层安全防护。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建
npm run start    # 启动生产服务
```

## 特性（对应重构方案 §13 优点）

1. **准实时**：Next.js ISR（默认 300s 重新生成），内容采集后即可上线
2. **完整 API**：`/api/public/*` 共 9 个端点，Agent 友好，OpenAPI 规范见 `/openapi.yaml`
3. **LLM 精选**：`src/lib/scoring.ts` 的 `computeScore` 模拟 LLM 打分（0-100），可平替为真实 LLM 调用
4. **多源信源**：每条内容标注完整信源，见 `src/lib/sources.ts`
5. **全文搜索 + 多维筛选**：按关键词 / 类型 / 标签 / 日期检索
6. **移动优先**：底部 5 栏导航 + 半屏速览 + 深色/浅色/跟随系统主题
7. **四层安全**：`src/middleware.ts`（UA 黑名单 + 限流 + 安全头）+ HMAC 图片代理
8. **SEO**：`/sitemap.xml` `/robots.txt` `/llms.txt` + 结构化数据
9. **RSS 多元**：`/feed.xml` `/feed/all.xml` `/feed/daily.xml` `/feed/category/{cat}.xml`

## 目录结构

```
src/
  app/
    page.tsx                 首页（热点 + 分类 + 简报卡片 + 精选流）
    all/                     全部动态
    daily/                   今日简报 + 存档 + [date]
    items/[id]/             内容详情
    category/[slug]/        分类
    tag/[tag]/              标签
    search/                 搜索
    agent/ about/ changelog/ feedback/
    api/public/             9 个 REST 端点
    feed*.xml/              RSS 路由
    robots.txt/ sitemap.xml/ llms.txt/ openapi.yaml/  SEO 路由
  components/               UI 组件
  lib/
    db/seed.ts             演示数据集（可平替为 Prisma + PostgreSQL）
    db/repository.ts        查询 / 分页 / 简报组装 / 搜索
    scoring.ts              LLM 精选打分（启发式）
    security.ts             HMAC 图片代理签名
    ratelimit.ts           限流 + UA 黑名单（Edge 安全）
    rss.ts                 RSS 构建
middleware.ts              分层安全防护
prisma/schema.prisma      PostgreSQL 生产数据模型（迁移路径）
```

## 生产迁移

开发原型使用内存 / JSON 仓储（`src/lib/db/repository.ts`）。上线时：

```bash
# 1. 用 Prisma 建表（模型见 prisma/schema.prisma）
npx prisma migrate dev --name init
# 2. 将 repository.ts 的 ITEMS 读写替换为 PrismaClient 查询
# 3. 将 scoring.ts 的 computeScore 替换为真实 LLM 调用
# 4. 前面由 nginx + 腾讯云 EdgeOne 承担分层限流与 JS Challenge
```

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `HACKCV_IMG_SECRET` | HMAC 图片代理签名密钥 | dev-only 占位值 |
| `DATABASE_URL` | PostgreSQL 连接串（生产） | — |

## License

MIT
