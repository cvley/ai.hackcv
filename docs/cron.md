# 定时采集部署说明（自有服务器）

hackcv 的采集由 `POST /api/cron/ingest` 触发（需 `x-cron-secret` 头校验，
未配置 `CRON_SECRET` 时接口返回 403 禁用）。本目录提供在你**自有服务器**上
用系统 `cron` 定时「敲门」的完整方案，无需 Vercel Cron，也天然契合现有代码。

> 补充：Vercel Cron 自动触发时只发 `Authorization: Bearer` 头，与本站
> `x-cron-secret` 约定不符；自有服务器方案可手动带该头，是最省心的选择。

---

## 一、准备

1. **站点已部署并可公网访问**
   - 接口地址形如 `https://你的域名/api/cron/ingest`。
   - 若 Next.js 应用就跑在这台服务器（如 `pm2` / `systemd` 监听 `:3000`），
     可改用 `http://localhost:3000/api/cron/ingest`，省去公网流量。

2. **部署环境已设置 `CRON_SECRET`**
   - 站点的 `.env`（或进程环境变量）里必须有 `CRON_SECRET=某个随机串`。
   - 路由逻辑：`provided !== process.env.CRON_SECRET` → 403。
   - 这个密钥由你自定，cron 脚本只是「发送」它，不会自动生成。

---

## 二、部署触发脚本

把仓库里的脚本放到服务器（示例路径 `/opt/hackcv/`）：

```bash
# 从仓库取出
sudo mkdir -p /opt/hackcv
sudo cp scripts/cron-ingest.sh /opt/hackcv/cron-ingest.sh
sudo chmod +x /opt/hackcv/cron-ingest.sh
sudo touch /var/log/hackcv-cron-ingest.log
sudo chmod 644 /var/log/hackcv-cron-ingest.log
```

脚本行为：
- `./cron-ingest.sh` —— 常规触发（服务端按 `fetchInterval` 节流）。
- `./cron-ingest.sh force` —— 加 `?force=1`，忽略节流做全量补偿。
- 内置 `flock` 并发锁：上一次未结束则本次跳过，避免重叠抓取 / 竞态。
- 每次运行 appends 一行日志到 `/var/log/hackcv-cron-ingest.log`（含 HTTP 状态码与响应摘要）。

手动试跑确认无误：

```bash
CRON_SECRET=你的密钥 HACKCV_ENDPOINT=https://你的域名 \
  /opt/hackcv/cron-ingest.sh
tail -n 3 /var/log/hackcv-cron-ingest.log   # 应看到 HTTP=200
```

---

## 三、配置 crontab

```bash
sudo crontab -e
```

粘贴 `cron.example` 的内容（或下面的最小版）：

```cron
CRON_SECRET=你的密钥
HACKCV_ENDPOINT=https://你的域名

# 每小时第 5 分：常规触发（尊重节流）
5 * * * * /opt/hackcv/cron-ingest.sh >> /var/log/hackcv-cron-ingest.log 2>&1

# （可选）每天 08:17 强制全量补偿
17 8 * * * /opt/hackcv/cron-ingest.sh force >> /var/log/hackcv-cron-ingest.log 2>&1
```

时区注意：crontab 按**本机本地时区**（`/etc/localtime`）计算，不是 UTC。
想北京时间触发，先设时区：

```bash
sudo timedatectl set-timezone Asia/Shanghai
```

---

## 四、`fetchInterval` 节流如何工作

`runIngestion` 在抓取每个信源前判断：

```
now - lastFetch < fetchInterval  ⇒ 跳过本次（throttled）
```

- `lastFetch` 每次成功抓取后由 `touchSource` 自动更新，无需手动维护。
- 各信源周期在 `src/lib/sources.ts` 配置：
  - arXiv / GitHub Trending：`86400s`（24 小时）
  - Hacker News / 36氪 / 量子位 / OpenAI / Google AI / 雷锋网 / TechCrunch：`3600s`（1 小时）
- 因此**一条每小时 cron 就自动实现「每小时新闻 / 每天论文」**——
  新闻源每小时重抓，论文源满 24h 才抓，靠 URL/标题去重挡住重复，安全幂等。
- 每日的 `force` 全量仅作兜底（兜住偶发漏抓 / 被节流跳过的源）。
- 后台「立即抓取全部信源」按钮走 `force: true`，永远强制执行，不受节流影响。

---

## 五、生产注意事项

- **耗时上限**：单次全量采集 + LLM 打分可能跑数分钟。若接近托管平台
  Function `maxDuration`，请调高上限，或改用每小时常规 + 每日 force 的分级策略。
- **并发**：cron 间隔小于单次耗时会导致重叠，脚本 `flock` 已防。手动连点
  「立即抓取」同理被 `force` 强制，但两次间隔过短仍可能并发，属预期。
- **失败不重试**：采集失败仅记入 `result.errors` 与日志，不自动重跑；
  每日 `force` 全量是简单可靠的补偿手段。
- **日志记录**：`/var/log/hackcv-cron-ingest.log` 可接 `logrotate`，
  也可加一行 `|| 告警` 在 HTTP≠200 时发通知（邮件 / 飞书 / 企业微信）。

---

## 六、备选：systemd timer

若服务器用 `systemd`，可改用 timer（自带 `Persistent=` 补跑漏触发、
`AccuracySec=` 错峰），比 cron 更现代。需写两个 unit：

- `/etc/systemd/system/hackcv-ingest.service` —— `ExecStart=/opt/hackcv/cron-ingest.sh`
- `/etc/systemd/system/hackcv-ingest.timer` —— `OnCalendar=hourly`

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hackcv-ingest.timer
```
