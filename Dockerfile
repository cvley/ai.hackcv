# syntax=docker/dockerfile:1

# ---------- 构建阶段 ----------
FROM node:22-slim AS builder
WORKDIR /app

# 安装全部依赖（build 阶段需要 prisma / tsx 等）
COPY package*.json ./
RUN npm ci

# Next build 时 ISR 页面会预渲染并连接数据库，
# 因此 build 阶段必须能连到已 migrate 的库。
# 通过 build-arg 传入（compose 里用 ${DATABASE_URL} 注入）。
ARG BUILD_DATABASE_URL
ENV DATABASE_URL=$BUILD_DATABASE_URL

COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- 运行阶段 ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# 仅复制运行所需产物与依赖
# （prisma / tsx / @prisma/client 已移至 dependencies，故 runtime 镜像内可用）
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
