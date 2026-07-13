const YAML = `openapi: 3.0.3
info:
  title: hackcv Public API
  version: "1.0.0"
  description: >
    实时 AI 资讯聚合平台 hackcv 的公开 REST API。所有接口位于 /api/public/，
    返回 JSON，支持分页、筛选与全文搜索。限流 60 次/分钟/IP。
servers:
  - url: https://ai.hackcv.com/api/public
paths:
  /items:
    get:
      summary: 内容条目列表
      parameters:
        - { name: mode, in: query, schema: { type: string, enum: [selected, all] }, description: 默认 selected }
        - { name: type, in: query, schema: { type: string, enum: [paper, project, news] } }
        - { name: since, in: query, schema: { type: string, format: date-time }, description: 限最近 30 天 }
        - { name: take, in: query, schema: { type: integer, minimum: 1, maximum: 100 }, description: 默认 20 }
        - { name: cursor, in: query, schema: { type: string }, description: 翻页游标 }
        - { name: q, in: query, schema: { type: string }, description: 关键词(2-200字符) }
        - { name: tag, in: query, schema: { type: string } }
        - { name: category, in: query, schema: { type: string } }
      responses:
        "200":
          description: 条目列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  count: { type: integer }
                  hasNext: { type: boolean }
                  nextCursor: { type: string }
                  items: { type: array, items: { $ref: "#/components/schemas/Item" } }
  /items/{id}:
    get:
      summary: 单条内容详情
      parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
      responses:
        "200": { description: 条目, content: { application/json: { schema: { $ref: "#/components/schemas/Item" } } } }
        "404": { description: 未找到 }
  /daily:
    get:
      summary: 今日研究简报
      responses:
        "200": { description: 简报, content: { application/json: { schema: { $ref: "#/components/schemas/Daily" } } } }
        "404": { description: 今日暂无 }
  /daily/{date}:
    get:
      summary: 指定日期简报
      parameters: [{ name: date, in: path, required: true, schema: { type: string, format: date } }]
      responses:
        "200": { description: 简报, content: { application/json: { schema: { $ref: "#/components/schemas/Daily" } } } }
        "404": { description: 未找到 }
  /dailies:
    get:
      summary: 简报列表
      parameters: [{ name: take, in: query, schema: { type: integer } }]
      responses:
        "200": { description: 简报列表 }
  /hot:
    get:
      summary: 当前热点
      parameters: [{ name: take, in: query, schema: { type: integer } }]
      responses:
        "200": { description: 热点条目 }
  /search:
    get:
      summary: 全文搜索
      parameters:
        - { name: q, in: query, required: true, schema: { type: string } }
        - { name: type, in: query, schema: { type: string, enum: [paper, project, news] } }
        - { name: page, in: query, schema: { type: integer } }
        - { name: pageSize, in: query, schema: { type: integer } }
      responses:
        "200": { description: 搜索结果 }
        "400": { description: q 过短 }
  /tags:
    get:
      summary: 标签列表
      responses:
        "200": { description: 标签与计数 }
  /img-proxy:
    get:
      summary: 图片代理（HMAC 签名）
      parameters:
        - { name: u, in: query, required: true, schema: { type: string }, description: 目标图片 URL(https) }
        - { name: mode, in: query, schema: { type: string }, description: 默认 webp }
        - { name: exp, in: query, required: true, schema: { type: integer }, description: 过期时间戳 }
        - { name: sig, in: query, required: true, schema: { type: string }, description: HMAC-SHA256 签名 }
      responses:
        "200": { description: 图片字节流 }
        "403": { description: 签名无效或过期 }
components:
  schemas:
    Item:
      type: object
      properties:
        id: { type: string }
        type: { type: string, enum: [paper, project, news] }
        title: { type: string }
        title_zh: { type: string }
        summary: { type: string }
        recommendation: { type: string }
        url: { type: string }
        permalink: { type: string }
        source: { type: string }
        sources: { type: array, items: { type: string } }
        publishedAt: { type: string, format: date-time }
        category: { type: string }
        tags: { type: array, items: { type: string } }
        score: { type: integer, description: LLM 精选分数 0-100 }
        selected: { type: boolean }
        projectFields: { type: object, properties: { stars: { type: integer }, todayStars: { type: integer }, language: { type: string } } }
        paperFields: { type: object, properties: { arxivId: { type: string }, authors: { type: array, items: { type: string } }, domains: { type: array, items: { type: string } } } }
        newsFields: { type: object, properties: { sourceUrls: { type: array, items: { type: string } } } }
    Daily:
      type: object
      properties:
        date: { type: string, format: date }
        lead: { type: object, properties: { title: { type: string }, summary: { type: string } } }
        sections: { type: array, items: { type: object, properties: { label: { type: string }, type: { type: string }, items: { type: array, items: { $ref: "#/components/schemas/Item" } } } } }
        stats: { type: object, properties: { totalItems: { type: integer }, readingTime: { type: string }, tokenCost: { type: integer } } }
`;

export const dynamic = "force-static";

export function GET() {
  return new Response(YAML, {
    headers: { "Content-Type": "application/yaml; charset=utf-8" },
  });
}
