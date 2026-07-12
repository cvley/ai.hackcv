// 将历史更新日志灌入 Changelog 表（按 version 幂等，重复运行安全）。
// 运行：node ./node_modules/.bin/tsx scripts/seed-changelog.ts
import { prisma } from "../src/lib/db/prisma";

const SEED: { version: string; title: string; items: string[] }[] = [
  {
    version: "2026-07-12",
    title: "定时采集与信源节流",
    items: [
      "新增自有服务器定时采集方案：cron 脚本（含 flock 并发锁）+ 部署说明文档",
      "信源抓取按 fetchInterval 自动节流：单条每小时任务即可区分「新闻每小时 / 论文每天」",
      "采集接口支持 ?force=1 强制全量补偿，后台「立即抓取」默认绕过节流",
    ],
  },
  {
    version: "2026-07-11",
    title: "品牌升级与稳定性修复",
    items: [
      "全新品牌图标全站上线（favicon + 顶栏 / 后台侧栏 / 登录卡统一 Logo）",
      "接入 8 家 LLM 供应商并支持自动降级，后台新增 Token 消耗统计与 API 可用性检测",
      "存量 207 条内容用 LLM 重新打分，精选标记自洽",
      "修复点击分类页 / 详情页因论文字段缺失导致的渲染崩溃",
    ],
  },
  {
    version: "2026-07-10",
    title: "重构为实时聚合平台",
    items: [
      "技术栈由 Hugo 静态站点升级为 Next.js 14 (App Router) + ISR",
      "上线 9 个公开 REST API 与 OpenAPI 规范",
      "引入 LLM 精选打分（0-100）与热点置顶",
      "新增全文搜索、标签 / 分类 / 日期多维导航",
      "新增 4 种 RSS、sitemap、robots、llms.txt",
      "四层安全防护：CDN / UA 黑名单 / 限流 / HMAC 图片代理",
    ],
  },
  {
    version: "2026-07-01",
    title: "简报结构优化",
    items: ["每日简报三大板块各增至 8 条", "论文卡片新增 PDF 下载与讨论链接"],
  },
  {
    version: "2026-06-15",
    title: "信源扩展",
    items: ["新增 Anthropic News、Papers With Code 信源", "行业资讯支持多信源归组展示"],
  },
];

async function main() {
  let added = 0;
  let skipped = 0;
  for (const e of SEED) {
    const existing = await prisma.changelog.findFirst({ where: { version: e.version } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.changelog.create({ data: e });
    added++;
  }
  console.log(`changelog seed done: added=${added}, skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error("seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
