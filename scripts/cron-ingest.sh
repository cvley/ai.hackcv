#!/usr/bin/env bash
#
# hackcv 定时采集触发器
# ---------------------------------------------------------------------------
# 作用：带并发锁 + 日志，向部署好的站点 POST /api/cron/ingest 触发一次采集。
#       真正的采集逻辑、fetchInterval 节流都在服务端，本脚本只负责「敲门」。
#
# 用法：
#   ./cron-ingest.sh          常规触发（尊重各信源 fetchInterval 节流）
#   ./cron-ingest.sh force    强制全量（忽略节流，用于每日全量补偿）
#
# 依赖：curl、flock（均随 util-linux / 主流发行版自带）
# 环境变量：
#   HACKCV_ENDPOINT  采集接口基址，默认 https://ai.hackcv.com
#   CRON_SECRET      必填，须与部署站点的 CRON_SECRET 环境变量一致
# ---------------------------------------------------------------------------
set -euo pipefail

ENDPOINT="${HACKCV_ENDPOINT:-https://ai.hackcv.com}/api/cron/ingest"
SECRET="${CRON_SECRET:?请在环境变量中设置 CRON_SECRET（需与站点部署环境一致）}"
LOCK="/tmp/hackcv-cron-ingest.lock"
LOG="/var/log/hackcv-cron-ingest.log"
BODY="/tmp/hackcv-cron-ingest.body"

MODE="${1:-}"
if [ "$MODE" = "force" ]; then
  ENDPOINT="${ENDPOINT}?force=1"
fi

# 并发锁：上一次采集未结束时直接跳过，避免重叠抓取 / 竞态
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Iseconds) SKIP: 上一次采集仍未结束，本次跳过" >> "$LOG"
  exit 0
fi

echo "$(date -Iseconds) START mode=${MODE:-normal}" >> "$LOG"
HTTP=$(curl -sS -o "$BODY" -w '%{http_code}' \
  --max-time 600 \
  -X POST "$ENDPOINT" \
  -H "x-cron-secret: $SECRET") || HTTP="000"
echo "$(date -Iseconds) HTTP=$HTTP resp=$(head -c 400 "$BODY")" >> "$LOG"
