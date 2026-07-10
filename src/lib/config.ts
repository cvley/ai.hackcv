// 站点级配置（替代 Hugo 的 config.toml）
export const SITE = {
  name: "hackcv",
  title: "hackcv · 实时 AI 资讯聚合",
  description:
    "hackcv 聚合 arXiv 论文、GitHub 开源项目与全球 AI 行业资讯，由 LLM 精选打分，准实时更新。",
  url: "https://hackcv.com",
  locale: "zh-CN",
  author: "hackcv",
  // 内容类型 → 中文标签
  typeLabels: {
    paper: "论文",
    project: "开源项目",
    news: "行业资讯",
  } as Record<string, string>,
  // 默认分页
  defaultTake: 20,
  maxTake: 100,
  // 信源聚合时间窗（天）
  sinceMaxDays: 30,
};

// 重构方案 §9 安全策略：HMAC 图片代理密钥（生产环境应来自环境变量）
export const IMG_PROXY_SECRET =
  process.env.HACKCV_IMG_SECRET || "dev-only-hmac-secret-change-me";

// 限流配置（次/分钟/IP），对应 nginx 分层限流
export const RATE_LIMITS = {
  publicPage: 120,
  api: 60,
  rss: 30,
} as const;
