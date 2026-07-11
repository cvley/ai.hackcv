# hackcv

实时 AI 资讯聚合平台 —— 参考 [AI HOT](https://aihot.virxact.com) 架构重构方案的实现。

> 技术栈：Next.js 14 (App Router) · TypeScript · ISR · 9 个公开 REST API · 4 种 RSS · PostgreSQL（Prisma 持久化）· 四层安全防护。

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
3. **LLM 精选**：`src/lib/llm.ts` 的 `scoreItem` 优先调用真实 LLM（Anthropic / OpenAI，env 配置）生成精选分 + 摘要 + 标签；未配置 key 时自动降级到 `src/lib/scoring.ts` 的启发式 `computeScore`，永远可运行
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
    db/prisma.ts           Prisma Client 单例（连接池）
    db/repository.ts        查询 / 分页 / 简报组装 / 搜索（PostgreSQL 实现，全 async）
    db/seed.ts             种子数据（信源 / 设置 / 初始条目）
    scoring.ts              LLM 精选打分（启发式）
    security.ts             HMAC 图片代理签名
    ratelimit.ts           限流 + UA 黑名单（Edge 安全）
    rss.ts                 RSS 构建
middleware.ts              分层安全防护
prisma/
    schema.prisma          PostgreSQL 数据模型（Item / Source / SiteSetting）
    seed.ts                种子灌入脚本（信源 + 设置 + 初始内容）
    migrations/            迁移历史（migrate dev 生成）
```

## 数据库（PostgreSQL 正式持久化）

内容数据（条目 / 信源 / 站点设置）已**正式持久化到 PostgreSQL**，通过 Prisma 访问，不再使用 JSON 文件存储。

```bash
# 1. 准备数据库（本地用 Homebrew 安装 PostgreSQL 16）
brew install postgresql@16
#   初始化并启动后，创建角色与库（密码按需修改）：
createdb hackcv
#   （或）createuser -sP hackcv 并建立 owned 库

# 2. 配置连接串（写入 .env）
DATABASE_URL=postgresql://hackcv:hackcv@localhost:5432/hackcv?schema=public

# 3. 建表（生成 prisma/migrations/ 与应用 schema）
npm run db:migrate        # = npx prisma migrate dev --name init

# 4. 灌入种子（信源 + 设置 + 30 条初始内容）
npm run db:seed           # = npx prisma db seed

# 其它：npx prisma studio（可视化） / npm run db:generate / npm run db:reset
```

> 上线到托管库（Neon / Supabase / RDS 等）只需把 `DATABASE_URL` 指向对方，并执行一次 migrate + seed 即可，代码无需改动。`/api/admin/ingest` 与 `/api/cron/ingest` 采集写入同样落到该库。

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `HACKCV_IMG_SECRET` | HMAC 图片代理签名密钥 | dev-only 占位值 |
| `HACKCV_ADMIN_SECRET` | 后台会话签名密钥 | dev-only 占位值 |
| `HACKCV_ADMIN_USER` | 后台管理员用户名 | `admin` |
| `HACKCV_ADMIN_PASS` | 后台管理员密码 | `admin123` |
| `ANTHROPIC_API_KEY` | 真实 LLM 精选打分（优先） | 不配置则降级启发式 |
| `ANTHROPIC_MODEL` | Anthropic 模型 | `claude-3-5-haiku-latest` |
| `SILICONFLOW_API_KEY` | 真实 LLM 精选打分（硅基流动，OpenAI 兼容） | 不配置则降级启发式 |
| `SILICONFLOW_MODEL` | 硅基流动模型 | `deepseek-ai/DeepSeek-V3` |
| `DEEPSEEK_API_KEY` | 真实 LLM 精选打分（DeepSeek，OpenAI 兼容） | 不配置则降级启发式 |
| `MOONSHOT_API_KEY` | 真实 LLM 精选打分（Moonshot Kimi，OpenAI 兼容） | 不配置则降级启发式 |
| `ZHIPU_API_KEY` | 真实 LLM 精选打分（Zhipu GLM，OpenAI 兼容） | 不配置则降级启发式 |
| `DASHSCOPE_API_KEY` | 真实 LLM 精选打分（Qwen 通义，OpenAI 兼容） | 不配置则降级启发式 |
| `OPENROUTER_API_KEY` | 真实 LLM 精选打分（OpenRouter 聚合，OpenAI 兼容） | 不配置则降级启发式 |
| `OPENAI_API_KEY` | 真实 LLM 精选打分（备选） | 不配置则降级启发式 |
| `OPENAI_MODEL` | OpenAI 模型 | `gpt-4o-mini` |

> **多供应商**：LLM 打分按优先级 `Anthropic → 其余 OpenAI 兼容供应商（数组顺序）` 依次尝试，任一成功即用；全部失败/未配置则降级到启发式 `computeScore`。新增供应商只需在 `src/lib/llm.ts` 的 `OAIC_PROVIDERS` 数组加一项（base URL + 两个 env 变量名），无需改动其它代码。后台「LLM 状态」页可一键检测各供应商的可用性与延迟；所有 LLM 调用的 token 消耗会按「日期 + 供应商」汇总，在「Token 消耗统计」中查看（累计 / 今日 / 按供应商 / 按日）。
| `CRON_SECRET` | 定时抓取调度密钥（`/api/cron/ingest`） | 不配置则该接口禁用 |
| `DATABASE_URL` | PostgreSQL 连接串（生产） | — |

> 注：项目根已存在 `.env` 时，其中的 `HACKCV_ADMIN_USER/PASS` 会**覆盖**默认值（当前为 `ley / ley`）。

## 自动采集（真实信源）

后台「立即抓取」按钮（或 `/api/admin/ingest`）会遍历已启用的信源，实时拉取并入库：

- **arXiv**（`cs.AI / cs.CL / cs.LG / cs.CV`，Atom API）→ 论文，按主分类映射标签
- **GitHub** Trending（Search API，AI/LLM topic）→ 项目
- **Hacker News**（Algolia API）→ 资讯
- **RSS**：36氪 / 量子位 / OpenAI Blog / Google AI Blog / 雷锋网 AI / TechCrunch AI

采集流程：`遍历已启用信源 → 抓取 → 按 URL/标题去重 → scoreItem 打分（LLM 或降级）→ 入库`。单信源每次上限 25 条（`lib/ingest.ts` 的 `MAX_PER_SOURCE`），避免 RSS 历史撑爆存储。失败信源记入 `result.errors`，不影响其它信源。

**定时调度**（生产）：由 Vercel Cron / GitHub Actions / crontab 带上 `x-cron-secret` 头调用 `POST /api/cron/ingest` 即可；未配置 `CRON_SECRET` 时该接口返回 403 禁用。

## 后台管理（/admin）

内容运营后台，需登录。默认账号 `admin / admin123`（**生产务必用环境变量覆盖**）。

- 登录：`/admin/login`（中间件放行；其他 `/admin/*` 与 `/api/admin/*` 未登录分别 307 跳转 / 401）
- 会话：HMAC-SHA256 签名的 httpOnly Cookie（`src/lib/auth.ts`，Web Crypto，edge/node 通用），有效期 8 小时
- 仪表盘 `/admin`：条数、精选数、分类、信源启用情况
- 内容管理 `/admin/items`：列表搜索、编辑、删除；`/admin/items/new` 新建；`/admin/items/[id]` 编辑
- 每日简报 `/admin/dailies`：一键生成/刷新当日简报
- 信源配置 `/admin/sources`：各信源启用/停用开关
- 站点设置 `/admin/settings`：站点名、标题、描述、每日报上限

数据写操作经 `src/lib/db/repository.ts` 落到 **PostgreSQL**（由 `DATABASE_URL` 指向的库，`prisma` 管理连接池）。公开接口与后台共享同一数据库，后台增删改即时持久化、反映到前台。

### 后台 API（均需会话）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 登录，下发 Cookie |
| POST | `/api/admin/logout` | 登出，清除 Cookie |
| GET | `/api/admin/stats` | 仪表盘数据（统计/分类/信源/设置） |
| GET/POST | `/api/admin/items` | 列表（全部）/ 新建 |
| GET/PATCH/DELETE | `/api/admin/items/[id]` | 单条 读取/更新/删除 |
| POST | `/api/admin/dailies/generate` | 生成当日简报 |
| GET/PATCH | `/api/admin/sources` | 信源列表 / 更新启用状态 |
| GET/PATCH | `/api/admin/settings` | 站点设置 读取 / 更新 |
| POST | `/api/admin/ingest` | 立即采集全部已启用信源（去重 + 打分 + 入库） |
| POST | `/api/cron/ingest` | 定时调度入口（需 `x-cron-secret` 头；未配 `CRON_SECRET` 则 403） |

## License

MIT
