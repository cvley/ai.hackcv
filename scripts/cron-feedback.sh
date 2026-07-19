#!/usr/bin/env bash
#
# hackcv 每日反馈 → 飞书 触发器
# ---------------------------------------------------------------------------
# 作用：带并发锁 + 日志，向部署好的站点 POST /api/cron/feedback-notify，
#       把未通知的用户反馈汇总成卡片推到飞书群机器人。
#       真正的汇总与推送逻辑都在服务端；本脚本只负责「敲门」。
#
# 用法：./cron-feedback.sh
# 依赖：curl、flock
# 环境变量：
#   HACKCV_ENDPOINT  接口基址，默认 https://ai.hackcv.com
#   CRON_SECRET      必填，须与部署站点的 CRON_SECRET 一致
#   （FEISHU_FEEDBACK_WEBHOOK / FEISHU_FEEDBACK_SECRET 在站点 .env 中配置）
# ---------------------------------------------------------------------------
set -euo pipefail

# cron 环境较干净：若未传入 CRON_SECRET，则从站点 .env 读取（仅脚本敲门需要它）
HACKCV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -z "${CRON_SECRET:-}" ] && [ -f "$HACKCV_DIR/.env" ]; then
  set -a; . "$HACKCV_DIR/.env"; set +a
fi

ENDPOINT="${HACKCV_ENDPOINT:-https://ai.hackcv.com}/api/cron/feedback-notify"
SECRET="${CRON_SECRET:?请在环境变量中设置 CRON_SECRET（需与站点部署环境一致）}"
LOCK="/tmp/hackcv-cron-feedback.lock"
LOG="/var/log/hackcv-cron-feedback.log"
BODY="/tmp/hackcv-cron-feedback.body"

# 并发锁：上一次未结束时跳过，避免重叠
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Iseconds) SKIP: 上一次仍未结束，本次跳过" >> "$LOG"
  exit 0
fi

echo "$(date -Iseconds) START" >> "$LOG"
HTTP=$(curl -sS -o "$BODY" -w '%{http_code}' \
  --max-time 60 \
  -X POST "$ENDPOINT" \
  -H "x-cron-secret: $SECRET") || HTTP="000"
echo "$(date -Iseconds) HTTP=$HTTP resp=$(head -c 400 "$BODY")" >> "$LOG"
