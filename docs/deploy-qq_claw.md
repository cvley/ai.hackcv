# hackcv 在 qq_claw 上的部署手册（定制版）

> 基于 `docs/deploy.md` 通用指南，结合 **qq_claw 机器的真实探测结果** 裁剪而成。
> 探测时间：2026-07-13。目标：把聚合站部署到独立子域名 `ai.hackcv.com`，**不碰现有 hackcv.com 主站**。

---

## 0. 目标机器现状（已探测）

| 项 | 现状 |
|----|------|
| 主机 | `qq_claw` = `ubuntu@43.134.169.44:22`（SSH 密钥登录） |
| OS | Ubuntu 24.04.4 LTS |
| 已有 | Nginx 1.24（监听 80/443，站点 `hackcv.conf` → `hackcv.com`）、git 2.43 |
| 未装 | **Node / PostgreSQL / Docker** 全都没有 |
| 端口冲突 | `127.0.0.1:3000` 被一个**返回 401 的未知本地服务**占用 → 本手册全程用 **3001** 避开，不动它 |
| DNS | `hackcv.com` 已 → `43.134.169.44`（主站本就在这台）；**`ai.hackcv.com` 暂无 A 记录**（第 0 步需你加） |
| TLS 证书 | `/etc/letsencrypt/live` 下无证书（主站 443 用的是别的证书路径，与本站无关） |

**结论**：走 `deploy.md` 的「Nginx + 系统 cron」裸机路线（不容器化，因为 Docker 没装、且 Nginx 已在做 TLS）。

---

## 0. 前置（你来做）

1. 到 DNS 面板加一条记录：
   - 类型 `A`，主机 `ai.hackcv.com`，值 `43.134.169.44`，TTL 设小（如 300s）。
2. 等生效后在**本地**确认：
   ```bash
   dig +short ai.hackcv.com      # 应返回 43.134.169.44
   ```
   返回正确后再继续第 6、7 步（certbot 申请证书需要域名先解析过来）。

---

## 1. 登录 & 拉代码

```bash
ssh qq_claw
sudo -i                       # 后续命令默认在 root 下执行
mkdir -p /srv && cd /srv
git clone https://github.com/cvley/ai.hackcv.git hackcv
cd hackcv && git checkout main
```

---

## 2. 安装 Node 20 LTS + PostgreSQL 16

```bash
# --- Node 20（NodeSource）---
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v                        # 期望 v20.x

# --- PostgreSQL 16 ---
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

建库与用户（**密码换成你自己的强口令**）：

```bash
sudo -u postgres psql <<'SQL'
CREATE USER hackcv WITH PASSWORD '换成强密码';
CREATE DATABASE hackcv OWNER hackcv;
SQL
```

记下连接串，第 4 步要用：

```
postgresql://hackcv:<上面强密码>@localhost:5432/hackcv?schema=public
```

---

## 3. 安装依赖 & 初始化数据库

```bash
cd /srv/hackcv
npm install
npx prisma generate
npx prisma migrate deploy          # 用已提交的 migrations 建表（不跑 seed）
npx tsx scripts/sync-sources.ts   # 【关键】把 9 个信源写入 Source 表（含 fetchInterval）
npx tsx scripts/seed-changelog.ts # 可选：灌入更新日志历史
```

---

## 4. 生产环境变量 `.env`

```bash
cp .env.example .env
nano .env
```

逐项修改（完整清单见 `deploy.md` 第 5 节），重点：

- `DATABASE_URL=` 填第 2 步那条连接串
- `SITE_URL=https://ai.hackcv.com`
- 下面 5 项安全变量**务必改成随机长串**（默认弱口令上线即被爆破）：
  ```bash
  CRON_SECRET=$(openssl rand -hex 32)
  HACKCV_ADMIN_SECRET=$(openssl rand -hex 32)
  HACKCV_IMG_SECRET=$(openssl rand -hex 32)
  HACKCV_ADMIN_USER=换个管理员名        # 不要留默认 admin
  HACKCV_ADMIN_PASS=换个强密码         # 不要留默认 admin123
  ```
- `ANTHROPIC_API_KEY` 等 8 家 LLM **可选**：不配则降级到启发式打分（免费可用）

---

## 5. 构建 & systemd 守护（用 3001 避开被占的 3000）

```bash
npm run build      # build 期 ISR 页面会连库预渲染，确保 .env 的 DATABASE_URL 指向已建表库
```

新建 `/etc/systemd/system/hackcv.service`：

```ini
[Unit]
Description=hackcv next.js (ai.hackcv.com)
After=network.target postgresql.service

[Service]
WorkingDirectory=/srv/hackcv
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3001
EnvironmentFile=/srv/hackcv/.env
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hackcv
curl -s -o /dev/null -w "local3001:%{http_code}\n" http://127.0.0.1:3001/
```

---

## 6. Nginx 反代（新增子域名 vhost，不动 hackcv.conf）

新建 `/etc/nginx/sites-available/ai.hackcv.conf`：

```nginx
server {
    listen 80;
    server_name ai.hackcv.com;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    server_name ai.hackcv.com;

    # 首次先注释掉下面两行（证书还没生成，否则 nginx -t 报错）
    # ssl_certificate     /etc/letsencrypt/live/ai.hackcv.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/ai.hackcv.com/privkey.pem;

    proxy_read_timeout 600s;      # 容纳长采集请求（cron 调用可能 >60s）
    proxy_connect_timeout 60s;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ai.hackcv.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> 此时 443 块里的 ssl 两行是注释状态，只有 80 → 443 跳转生效。证书在第 7 步生成后取消注释并 reload 即可。

---

## 7. HTTPS 证书（DNS A 记录生效后做）

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ai.hackcv.com
```

certbot 会自动：申请 Let's Encrypt 证书、把 ssl 两行写进 nginx 配置、重载 Nginx。
（证书续期 certbot 会自动加 systemd timer，无需手动。）

---

## 8. 定时采集（crontab）

```bash
sudo crontab -e
```

```cron
CRON_SECRET=<与 .env 里相同的长随机串>
HACKCV_ENDPOINT=https://ai.hackcv.com

# 每小时第 5 分常规抓取（fetchInterval 节流自动区分：新闻 1h / 论文·GitHub 24h）
5 * * * * /srv/hackcv/scripts/cron-ingest.sh

# 每天 08:17 强制全量补偿（绕过节流，补齐漏抓）
17 8 * * * /srv/hackcv/scripts/cron-ingest.sh force
```

> `CRON_SECRET` 必须与服务器 `.env` 中的 `CRON_SECRET` 完全一致，否则接口返回 403。
> 接口自身已按 `Source.fetchInterval` 节流，单次每小时 cron 即可实现「每小时新闻 / 每天论文」。

---

## 9. 验证清单

| 检查 | 地址 / 命令 | 期望 |
|------|---------------|------|
| 首页 | `https://ai.hackcv.com/` | 200，显示聚合内容 |
| 分类页 | `https://ai.hackcv.com/category/research` | 200，无运行时错误 |
| 关于页 | `https://ai.hackcv.com/about` | 200 |
| 开发者中心 | `https://ai.hackcv.com/developers` | 200 |
| CLI / Skill | `https://ai.hackcv.com/cli` · `/skill` | 200 |
| 更新日志 | `https://ai.hackcv.com/changelog` | 200 |
| 后台登录 | `https://ai.hackcv.com/admin` → 跳 `/admin/login` | 307 → 登录页 |
| 公开 API | `https://ai.hackcv.com/api/public/items?limit=1` | 200，JSON |
| RSS | `https://ai.hackcv.com/feed.xml` | 200，XML |
| sitemap/robots | `/sitemap.xml` · `/robots.txt` | 200，域名正确 |
| 手动触发采集 | `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://ai.hackcv.com/api/cron/ingest` | 200，含 `totalThrottled` |

---

## 10. 更新与回滚

```bash
cd /srv/hackcv
git pull
npm install
npx prisma generate
npx prisma migrate deploy     # 仅当有新迁移时生效
npm run build
sudo systemctl restart hackcv
```

- **DB 变更**：新迁移随 `git pull` 进来，`migrate deploy` 自动应用。
- **回滚**：`git checkout <旧commit>` + 重新 `build` + 重启；数据库结构一般不回滚（向后兼容）。

---

## 风险与注意事项

1. **3000 被占用**：全程用 **3001**，未触碰那个返回 401 的未知服务。若日后想复用 3000，需先
   `sudo ss -tlnp | grep 3000` 查清进程并确认可停，再改 systemd 的 `-p` 与 nginx 的 `proxy_pass`。
2. **不改 `hackcv.conf`**：主站 `hackcv.com` 完全不动，本站只是新增一个独立子域名 vhost（nginx 按 `Host` 头路由，443 端口不冲突）。
3. **build 期连库**：`npm run build` 时 ISR 页面会预渲染并连 `DATABASE_URL`，确保 `.env` 指向已 `migrate deploy` 的库。
4. **密钥是上线硬门槛**：5 项安全变量（`ADMIN_USER/PASS/SECRET`、`IMG_SECRET`、`CRON_SECRET`）必须改成随机/强值，别用默认 `admin/admin123`。
5. **LLM 打分可选**：不配 API Key 也能跑，只是精选分走启发式。
