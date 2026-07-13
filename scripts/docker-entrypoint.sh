#!/bin/sh
set -e

echo "▶ prisma migrate deploy"
npx prisma migrate deploy

echo "▶ 初始化信源（幂等，首次建 9 个 feed）"
npx tsx scripts/sync-sources.ts

echo "▶ 启动 Next.js"
exec npm run start
