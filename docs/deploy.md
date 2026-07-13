# hackcv 生产部署指南

本指南覆盖把 hackcv 从开发机搬到一台自有服务器（Linux）并对外提供 `https://<你的域名>` 的完整步骤。
定时采集部分见同级 [`cron.md`](./cron.md)，本文第 7 节只做衔接。

---

## 1. 拓扑

```
浏览器 ──HTTPS──▶ Nginx(80/443, TLS) ──▶ Next.js (next start, :3000)
                                                  │
                           PostgreSQL(:5432) ◀───┘   （同一台机器或独立库）
                           cron(txt) ──每小时──▶ POST /api/cron/ingest  (带 x-cron-secret)
```

> 你已有"自己的服务器"，所以走 **Nginx + Node 常驻进程 + 系统 cron** 这套，不依赖 Vercel。
> 想进一步容器化（Docker Compose 编排 web + db + scheduler）见第 11 节。
> Vercel 的局限（Hobby 每天仅 1 次 cron、且自动发 `Authorization: Bearer` 而非本站约定的 `x-cron-secret`）见文末附录，仅作备选参考。

---

## 2. 上线前必做（两处代码/配置改动）

### 2.1 站点域名 `SITE.url`（已改为环境变量，默认子域名）

`src/lib/config.ts` 改为读取环境变量，默认指向聚合站专属子域名：

```ts
// 默认 https://ai.hackcv.com（与线上主站 hackcv.com 分离，互不影响）
const SITE_URL = process.env.SITE_URL || "https://ai.hackcv.com";
export const SITE = { /* ... */ url: SITE_URL };
```

> 线上 `hackcv.com` 是原有的 Hugo 静态博客，本 Next.js 聚合站部署在独立子域名
> `ai.hackcv.com`，两者互不干扰。sitemap / robots / RSS / OG / `metadataBase` / API 文档
> 全部读 `SITE.url`，改域名只需在部署机 `.env` 设 `SITE_URL`，无需改代码。

`.env.example` 已新增：

```bash
SITE_URL=https://ai.hackcv.com
```

部署机 `.env` 填真实对外域名即可（保持 `ai.hackcv.com` 或后续换成正式域名）。

### 2.2 Prisma 在 `devDependencies` 里，生产安装会缺依赖

`package.json` 当前把 `prisma`、`@prisma/client`、`tsx` 都放在 `devDependencies`。
而 `next build` 需要 `@prisma/client`（已生成到 `node_modules/.prisma`）和 `prisma migrate deploy` 需要 `prisma` CLI；
`scripts/*.ts` 用 `tsx` 跑。若部署机用 `npm ci --omit=dev`，运行时会缺这些而报错。

**推荐改动**：把它们移到 `dependencies`：

```jsonc
"dependencies": {
  "next": "14.2.5",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "@prisma/client": "^5.22.0",
  "prisma": "^5.22.0"
},
"devDependencies": {
  "@types/node": "20.14.10",
  "@types/react": "18.3.3",
  "@types/react-dom": "18.3.0",
  "tsx": "^4.23.0",
  "typescript": "5.4.5"
}
```

> 若不想动 `package.json`，则部署机用 `npm install`（不省略 dev）也能跑，只是会多装 typescript/tsx。

---

## 3. 服务器环境要求

| 组件 | 版本 / 要求 |
|------|---------------|
| OS | 任意现代 Linux（Ubuntu 22.04 LTS 示例） |
| Node.js | ≥ 18.18，推荐 **20 LTS** 或 **22 LTS**（开发用 22.22.2） |
| PostgreSQL | 16（或 ≥ 14） |
| Nginx | 最新稳定版（反向代理 + TLS） |
| 进程守护 | pm2 或 systemd（二选一，见第 6 节） |
| Git | 能拉取你的仓库（需先配置 remote，见第 10 节） |

---

## 4. 部署流程（按顺序执行）

```bash
# 0) 登录服务器，进入部署目录（示例）
cd /srv/hackcv
git clone <你的仓库地址> .        # 或 git pull 更新
git checkout main

# 1) 安装依赖（含 dev，确保 prisma/tsx 在场）
npm install

# 2) 生成 Prisma Client
npx prisma generate

# 3) 生产库建表（用已提交的 migrations，不跑 seed）
npx prisma migrate deploy

# 4) 初始化信源（关键！否则采集/后台为空）
#    把 src/lib/sources.ts 里定义的 9 个源写入 Source 表，含 fetchInterval
npx tsx scripts/sync-sources.ts

# 5) （可选）灌入更新日志历史 5 条，按 version 幂等
npx tsx scripts/seed-changelog.ts

# 6) 创建生产环境变量
cp .env.example .env
nano .env        # 逐项填写，见第 5 节清单

# 7) 构建（注意：存在 ISR 页面会 build 时预渲染并连 DB）
#    ⇒ build 前必须保证 .env 的 DATABASE_URL 指向「已建表」的生产库
npm run build

# 8) 启动（pm2 / systemd 任选，见第 6 节；不要裸跑 next start）
```

> **build 失败排查**：若 `npm run build` 报 DB 连接错误，说明有 ISR 页面在 build 时查询了数据库。
> 先确保第 3 步 `migrate deploy` 已成功、且 `.env` 的 `DATABASE_URL` 能被构建进程读到（与运行进程同一份 `.env`），再重试 build。
> 若生产库暂时为空（刚建表），build 只会预渲染出空页面，不影响上线，首次访问 revalidate 后自动填充。

---

## 5. 环境变量清单（`.env`）

复制自 `.env.example`，**生产务必修改所有 `change-me` / 默认弱口令**：

| 变量 | 说明 | 生产要求 |
|------|------|----------|
| `DATABASE_URL` | PostgreSQL 连接串 | 指向生产库，如 `postgresql://hackcv:<强密码>@localhost:5432/hackcv?schema=public` |
| `SITE_URL` | 站点对外域名（驱动 sitemap/robots/RSS/OG/metadataBase/API 文档地址） | 默认 `https://ai.hackcv.com`，部署到其它域名时改为对应地址 |
| `HACKCV_ADMIN_USER` | 后台账号 | **改掉默认 `admin`** |
| `HACKCV_ADMIN_PASS` | 后台密码 | **改掉默认 `admin123`**（弱口令，上线即被爆破） |
| `HACKCV_ADMIN_SECRET` | 管理员会话 JWT 签名密钥 | **必须改长随机串**；否则会话可被伪造 |
| `HACKCV_IMG_SECRET` | 图片代理 HMAC 签名密钥 | 改长随机串；否则图片签名校验失效 |
| `CRON_SECRET` | 定时抓取接口密钥 | 长随机串；与第 7 节 cron 脚本里的 `CRON_SECRET` 一致 |
| `ANTHROPIC_API_KEY` 等 8 家 LLM | 精选打分用 | **可选**；不配则降级到启发式打分（免费可用） |

> 安全相关 5 项（ADMIN_USER/PASS/SECRET、IMG_SECRET、CRON_SECRET）是上线硬门槛，缺一不可。

---

## 6. 进程守护（pm2 或 systemd 二选一）

### 方案 A：pm2（简单）

`ecosystem.config.cjs`：

```js
module.exports = {
  apps: [{
    name: "hackcv",
    script: "node_modules/.bin/next",
    args: "start -p 3000",
    cwd: "/srv/hackcv",
    env_file: "/srv/hackcv/.env",
    instances: 1,            // 抓取有并发写，先单实例；多实例需加分布式锁
    autorestart: true,
    max_memory_restart: "1G",
  }],
};
```

```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup    # 开机自启
```

### 方案 B：systemd（更"系统原生"）

`/etc/systemd/system/hackcv.service`：

```ini
[Unit]
Description=hackcv next.js
After=network.target postgresql.service

[Service]
WorkingDirectory=/srv/hackcv
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
EnvironmentFile=/srv/hackcv/.env
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hackcv
```

---

## 7. 定时采集（衔接 cron.md）

见 [`cron.md`](./cron.md)。要点：用你服务器的 **crontab** 每小时调一次本站接口，脚本 `scripts/cron-ingest.sh` 自带 `flock` 并发锁和日志。

```bash
# 编辑：crontab -e
CRON_SECRET=<与 .env 相同的长随机串>
HACKCV_ENDPOINT=https://你的域名

# 每小时第 5 分常规抓取（fetchInterval 节流自动区分：新闻 1h / 论文·GitHub 24h）
5 * * * * /srv/hackcv/scripts/cron-ingest.sh

# 每天 08:17 强制全量补偿（绕过节流，补齐漏抓）
17 8 * * * /srv/hackcv/scripts/cron-ingest.sh force
```

- 时区 = 服务器 `/etc/localtime`，非 UTC；想北京时间请用 `timedatectl set-timezone Asia/Shanghai`。
- `CRON_SECRET` 必须与该服务器 `.env` 中的 `CRON_SECRET` 完全一致，否则接口返回 403。
- 接口自身已按 `Source.fetchInterval` 节流，单次每小时 cron 即可实现"每小时新闻 / 每天论文"。

---

## 8. 反向代理 + HTTPS（Nginx）

`/etc/nginx/sites-available/hackcv`：

```nginx
server {
    listen 80;
    server_name 你的域名;
    # 证书申请期用，申请后由 certbot 接管 443
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    server_name 你的域名;

    ssl_certificate     /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;
    # 推荐加上 ssl_protocols / ssl_ciphers 等加固项

    # 大文件/长采集请求（cron 调用可能 >60s）
    proxy_read_timeout 600s;
    proxy_connect_timeout 60s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

申请证书（Let's Encrypt）：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

> 应用中间件（`middleware.ts`）已内置：UA 黑名单拦截、API/RSS 限流、安全响应头、后台鉴权重定向。Nginx 侧无需重复限流，但建议保留上面的超时配置以容纳长采集请求。

---

## 9. 上线验证清单

部署并启动后，逐项确认：

| 检查 | 命令 / 地址 | 期望 |
|------|----------------|------|
| 首页 | `https://你的域名/` | 200，显示聚合内容 |
| 分类页 | `https://你的域名/category/research` 等 | 200，无运行时错误 |
| 关于页 | `https://你的域名/about` | 200 |
| 更新日志 | `https://你的域名/changelog` | 200，含后台编辑的条目 |
| 后台登录 | `https://你的域名/admin` → 跳 `/admin/login` | 307 → 登录页 |
| 公开 API | `https://你的域名/api/public/items?limit=1` | 200，返回 JSON |
| RSS | `https://你的域名/feed.xml` | 200，XML |
| favicon | 浏览器 tab | 蓝底「h」+ 星点 |
| 手动触发采集 | `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://你的域名/api/cron/ingest` | 200，含 `totalThrottled` |
| sitemap/robots | `/sitemap.xml`、`/robots.txt` | 200，域名正确 |

---

## 10. 更新与回滚

```bash
cd /srv/hackcv
git pull
npm install
npx prisma generate
npx prisma migrate deploy     # 仅当有新迁移时生效
npm run build
# 重启进程
pm2 restart hackcv            # 或 sudo systemctl restart hackcv
```

- **DB 变更**：新迁移已随 `git pull` 进来，`migrate deploy` 自动应用，无需手工。
- **回滚**：`git checkout <旧commit>` + 重新 `build` + 重启；数据库结构一般不回滚（向后兼容原则）。
- **首次 push 到 remote**：当前仓库还没有配置远端，需先在开发机 `git remote add origin <地址>` + `git push -u origin main`，服务器才能 `git pull`。

---

## 11. 容器化部署（Docker）

不想在服务器上手配 Node / PostgreSQL / pm2？可以用 Docker Compose 一键编排
`web(Next.js) + db(PostgreSQL) + scheduler(定时采集)`。已新增 `Dockerfile`、
`docker-compose.yml`、`.dockerignore`、`scripts/docker-entrypoint.sh` 四个文件。

### 11.1 配套改动（已做）
- `package.json`：把 `prisma` / `@prisma/client` / `tsx` 从 `devDependencies` 移到 `dependencies`。
  原因：运行镜像若用 `npm ci --omit=dev`，会缺 `@prisma/client`（运行时必须）和 `prisma` / `tsx`
  （entrypoint 要跑 `migrate deploy` 与 `sync-sources`）。移入 deps 是最简正解。

### 11.2 文件说明
| 文件 | 作用 |
|------|------|
| `Dockerfile` | 多阶段构建：builder 装全依赖 + `next build`（build 期需连库做 ISR 预渲染）；runner 仅复制产物 + `docker-entrypoint.sh` |
| `docker-compose.yml` | 编排 `db`(postgres:16-alpine) / `web`(build 当前目录) / `scheduler`(alpine + dcron，每小时敲 web) |
| `.dockerignore` | 忽略 `node_modules` / `.next` / `.env` / 日志等 |
| `scripts/docker-entrypoint.sh` | 启动前自动 `prisma migrate deploy` + `tsx scripts/sync-sources.ts`（幂等初始化 9 源）+ `next start` |

### 11.3 使用步骤
```bash
# 1) 准备环境变量（含生产密钥，改掉所有默认弱口令）
cp .env.example .env
vim .env      # 至少填 DATABASE_URL / CRON_SECRET / HACKCV_ADMIN_* / HACKCV_*_SECRET

# 2) 先起 db 并建表（build 阶段 ISR 预渲染需要连到「已建表」的库）
docker compose up db -d
docker compose run --rm web npx prisma migrate deploy

# 3) 构建并启动全部（web 会自动 migrate + sync-sources + start）
docker compose up -d --build

# 4) 验证
curl -s -o /dev/null -w "home:%{http_code}\n" http://localhost:3000/
docker compose logs -f web
```

### 11.4 关键点
- **build 期必须能连库**：`next build` 时 ISR 页面会预渲染并连 `DATABASE_URL`。
  compose 通过 `build.args.BUILD_DATABASE_URL: ${DATABASE_URL}` 把运行期连接串透传给构建阶段；
  运行期 `DATABASE_URL` 来自 `.env`，指向 compose 内的 `db` 服务名（`postgresql://hackcv:...@db:5432/hackcv`）。
- **定时采集**：`scheduler` 容器复用你已有的 `scripts/cron-ingest.sh`，
  每小时第 5 分 `POST http://web:3000/api/cron/ingest`，自带 `flock` 并发锁。
  与第 7 节「服务器 crontab」方案完全同源——只是从「宿主机 cron」挪到了「scheduler 容器」。
  若你只想用宿主机 cron（不在 compose 里跑 scheduler），把 `scheduler` 服务整段删掉即可，
  宿主机 `crontab` 照旧敲 `http://localhost:3000/api/cron/ingest`（web 已把 3000 映射出来）。
- **数据持久化**：`db` 的 `/var/lib/postgresql/data` 挂在 `pgdata` 卷，删容器不丢数据。
- **反向代理 / HTTPS**：容器化后 `web` 仍只监听 3000，外层 Nginx（第 8 节配置）不变，
  把 `proxy_pass http://127.0.0.1:3000` 指向宿主机映射出的 3000 即可。
- **更新**：`git pull` 后 `docker compose up -d --build`；DB 变更由 entrypoint 的 `migrate deploy` 自动应用。
- **域名 `SITE.url`**：已改为环境变量 `SITE_URL`（默认 `https://ai.hackcv.com`，与线上 `hackcv.com` 主站分离）。
  容器里在 `docker-compose.yml` 的 `web` 服务 `environment` 设 `SITE_URL=https://ai.hackcv.com` 即可（见第 11 节示例），无需改代码。

---

## 附录：为什么不用 Vercel（备选参考）

- **Cron 频率**：Hobby 免费版每天最多 1 次，`0 * * * *` 会部署失败；Pro 才支持每小时。本站新闻源配 3600s（1h），Hobby 无法满足。
- **鉴权错位**：Vercel Cron 自动在请求头注入 `Authorization: Bearer <CRON_SECRET>`；而本站 `/api/cron/ingest` 约定读 `x-cron-secret`（见 `cron.md`）。直接上 Vercel 会因 403 永远跑不起来，需改路由或改用外部调度。
- **结论**：你有自有服务器，用本文 Nginx + systemd/cron 方案最稳妥、免费、且完全契合现有 `x-cron-secret` 约定。
