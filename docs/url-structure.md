# hackcv 地址结构分析 & 原有博客地址适配

> 写于 2026-07-12。基于**线上真实探测**（hackcv.com 已在线）与**本地 git HEAD 代码**双向对比。
> 目的：弄清现有地址结构，并给出"如何适配原有博客地址"的方案。

## 0. 部署决策（2026-07-12 更新）

- **线上 `hackcv.com` 保持不动**：原有内容与地址（含 `/posts`、`/zh-cn/`、`/en/` 等）继续由原站服务，本次重构不触碰。
- **本 Next.js 聚合站部署到独立子域名 `https://ai.hackcv.com`**（见 `src/lib/config.ts` 的 `SITE_URL`，默认即此）。
- **影响**：因为聚合站是**独立主机名**，不再与 `hackcv.com` 共享路径空间，所以第 3/4 节的" `/posts` 与 `/daily` 路径冲突"问题**自然消解**——两者分属不同 origin，无需在 Next 内做 `/posts` 兼容路由或 Nginx 分流。
- 第 5 节原决策项中的"代码同步 / 适配目标"因此**不再阻塞**本次上线；下方分析仅作架构留档。

---

## 1. 线上真实地址结构（curl 实测，均 200 除非注明）

| 路径 | HTTP | 说明 |
|------|------|------|
| `/` | 200 | 首页（聚合信息流） |
| `/posts/` | 200 | **博客列表页**（原有博客形态） |
| `/posts/research-brief-YYYY-MM-DD/` | 200 | **每日研究简报的博客版**，slug = `research-brief-<日期>` |
| `/zh-cn/` · `/en/` | 200 | 语言版首页（i18n） |
| `/zh-cn/posts/...` · `/en/posts/...` | 200 | 带语言前缀的博客地址 |
| `/items/` · `/items/<id>` | 200 | 聚合内容详情（重构后的形态） |
| `/daily/` · `/daily/<date>` · `/daily/archive` | 200 | 每日简报（聚合形态，与 `/posts` 内容等价） |
| `/category/<slug>` · `/tag/<tag>` · `/all` · `/search` · `/agent` | 200 | 分类 / 标签 / 全量 / 搜索 / Agent 专题 |
| `/about` · `/changelog` · `/feedback` | 200（`/about`→`/about/` 301 规范化） | 静态页 |
| `/admin/*` | 307→`/admin/login` | 后台鉴权重定向 |
| `/feed.xml` · `/feed/all.xml` · `/feed/daily.xml` · `/feed/category/<cat>` | 200 | RSS |
| `/sitemap.xml` → `/zh-cn/sitemap.xml` + `/en/sitemap.xml` | 200 | 分语言 sitemap index |
| `/robots.txt` · `/llms.txt` · `/openapi.yaml` | 200 | SEO / LLM / API 文档 |

**关键事实**：线上**同时存活两套地址**——
- 博客式：`/posts/<slug>/`（带 `/zh-cn/`、`/en/` 前缀）
- 聚合式：`/items/<id>`、`/daily/<date>`

且 `/posts/<date>` 与 `/daily/<date>` **内容等价**（都是"每日研究简报"）。

---

## 2. 本地 git HEAD 代码地址结构（find src/app）

本地路由：**`/`、`/category/[slug]`、`/items/[id]`、`/tag/[tag]`、`/all`、`/daily`、`/daily/[date]`、`/daily/archive`、`/agent`、`/search`、`/about`、`/changelog`、`/feedback`、`/admin/*`、`/api/*`、`/feed.*`、`/sitemap.xml`、`/robots.txt`、`/llms.txt`、`/openapi.yaml`**。

**缺失项**（本地代码里**没有**）：
- ❌ `/posts` 任何路由（博客式地址在本地 git 不存在）
- ❌ i18n：`next.config.mjs` 仅 `reactStrictMode`，无 `i18n` 配置；`middleware.ts` 无 locale 处理；无 `/zh-cn/`、`/en/` 前缀逻辑

---

## 3. 核心矛盾：线上 ≠ 本地 git

```
线上运行代码  =  /posts + i18n + 聚合(/items,/daily)
本地 git HEAD =  /items + /daily + 聚合（无 /posts、无 i18n）
```

两种最可能的解读：

- **解读 A（同一 Next 项目的新版本）**：服务器上跑的是比本地 git 更新的同一份代码（含博客 + i18n），本地 git 落后。
  → **风险**：若用本地 git 直接部署，会**丢失 `/posts` 与 i18n**，原有博客地址全部 404。
- **解读 B（Nginx 混部）**：`/posts/`、`/zh-cn/`、`/en/` 是 Nginx 直接服务的**旧博客静态页**（如 Hugo/Hexo 生成），新 Next 聚合站只接管 `/items/`、`/daily/`、`/category/` 等其余路径。
  → 博客地址本就独立存活，"适配"实为保持 Nginx 分流，无需在 Next 里动它。

---

## 4. 如何适配原有博客地址（按解读分方案）

### 若解读 A（同一 Next 代码，需保留 /posts 兼容）
1. **先把线上代码同步回 git**（见第 5 节待决策 3）——否则本地任何改动部署都会覆盖掉 `/posts`。
2. 重构/新增功能时保留 `/posts/[slug]` 路由，使其继续渲染每日简报（或作为 `/daily` 的别名）。
3. **SEO 去重**：`/posts/<date>` 与 `/daily/<date>` 内容等价，二选一：
   - **canonical**：在 `/posts` 页 `<head>` 加 `<link rel="canonical" href="/daily/<date>">`，告诉搜索引擎主地址是 `/daily`。
   - **301 合并**：在 `next.config` 的 `redirects()` 或 `middleware` 里把 `/posts/<slug>` → `/daily/<date>` 永久重定向（推荐，最干净，旧外链/收录自动归并）。

### 若解读 B（Nginx 混部，博客是静态旧站）
"适配"= Nginx `location` 分流，样例如下：
```nginx
# 旧博客静态资源（由 Nginx 直接服务，不走 Next）
location ^~ /posts/     { root /srv/hackcv-blog; try_files $uri $uri/ =404; }
location ^~ /zh-cn/    { root /srv/hackcv-blog; try_files $uri $uri/ =404; }
location ^~ /en/       { root /srv/hackcv-blog; try_files $uri $uri/ =404; }

# 其余路径交给 Next 聚合站
location / {
    proxy_pass http://127.0.0.1:3000;
    # ... 既有 proxy 配置
}
```
→ 此时原有博客地址无需在 Next 里实现，只要 Nginx 不把 `/posts`、`/zh-cn`、`/en` 反代给 3000 即可。

---

## 5. 待你决策 / 提供（落地必需，不能替你定）

1. **线上 `/posts` + i18n 是哪来的？**
   - (a) 同一 Next 项目的新版本（本地 git 落后，需同步回来）？
   - (b) Nginx 旁的独立旧博客（Hugo/Hexo 静态）？
   - 这决定"适配"是在 Next 里做，还是只在 Nginx 做。

2. **适配目标**：
   - 保留 `/posts` 继续可访问（兼容）？
   - 还是 301 合并到 `/daily`（SEO 集中）？
   - 还是 `/posts` 作为 canonical 主地址、`/daily` 反指？

3. **代码同步**：若解读 A 成立，需先把线上版本拉回 git —— 当前 `git remote` 为空（之前 `git push` 失败的根因），需要你提供远端地址（`git remote add` + `fetch`）。

> 拿到上面 1–3 的答复后，我可以直接落地对应改动（redirects / 兼容路由 / Nginx 片段 / 同步 git）。
