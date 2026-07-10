import type { Item } from "./types";

/**
 * LLM 精选打分（重构方案 §8.2）
 *
 * 生产环境此处应调用 Claude / GLM 等 LLM，依据：
 *   1. 时效性  2. 重要性  3. 信源权重  4. 社区热度
 * 生成 0-100 分，并为高分内容撰写 recommendation（推荐理由）。
 *
 * 本仓库为可运行原型，使用确定性的启发式算法模拟该 Pipeline 输出，
 * 保证每次构建结果稳定、可复现。将 computeScore 替换为真实 LLM 调用即可上线。
 */
export function computeScore(item: Pick<Item, "sources" | "type" | "publishedAt" | "selected">): number {
  let score = 50;

  // 信源数量：多源归组事件权重更高（最多 +30）
  const extra = Math.max(0, item.sources.length - 1);
  score += Math.min(extra, 5) * 6;

  // 时效性：越新越高（最多 +15）
  const ageDays = (Date.now() - new Date(item.publishedAt).getTime()) / 86_400_000;
  if (ageDays <= 1) score += 15;
  else if (ageDays <= 2) score += 10;
  else if (ageDays <= 3) score += 6;
  else if (ageDays <= 7) score += 3;

  // 内容类型微调
  if (item.type === "paper") score += 5;
  else if (item.type === "project") score += 3;

  // 已精选内容保底
  if (item.selected) score = Math.max(score, 60);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** 热点热度：信源数 × 分数 × 时间衰减（重构方案 §8.2 步骤6） */
export function hotness(item: Item): number {
  const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000;
  const decay = Math.exp(-ageHours / 48); // 48h 半衰期
  return item.sources.length * item.score * decay;
}
