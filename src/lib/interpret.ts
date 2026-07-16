import type { Item, Interpretation } from "./types";
import { completeJson } from "./llm";

// 论文解读：结构化 JSON
const PAPER_PROMPT = (it: Item) => `你是 AI 论文解读编辑，用中文为读者解读下面这篇论文。只输出 JSON，不要其它文字。
字段要求：
- summary: 一句话中文导读（≤30 字）
- problem: 这篇论文要解决什么问题
- method: 核心方法 / 模型思路（技术要点）
- contribution: 主要贡献是什么
- experiments: 关键实验或数据（若无则说明「未提供」）
- significance: 意义、影响与局限
- whoFor: 适合谁读（研究者 / 工程师 / 产品等）

待解读论文：
标题：${it.title}${it.title_zh ? `（${it.title_zh}）` : ""}
作者：${(it.paperFields?.authors || []).join("、") || "未知"}
领域：${(it.paperFields?.domains || []).join("、") || "未知"}
摘要：
${(it.summary || "").slice(0, 6000)}`;

// 代码解读：结构化 JSON
const PROJECT_PROMPT = (it: Item, readme: string) => `你是 AI 开源项目解读编辑，用中文为开发者解读下面这个项目。只输出 JSON，不要其它文字。
字段要求：
- summary: 一句话中文导读（≤30 字）
- what: 这个项目做什么
- highlights: 字符串数组，3 个以内核心亮点
- techStack: 技术栈 / 实现要点
- useCases: 适用场景
- whyAi: 与 AI / 大模型的关系
- whoFor: 适合谁用（研究者 / 工程师 / 产品等）

待解读项目：
名称：${it.title}
描述：${(it.summary || "").slice(0, 600)}
README：
${readme.slice(0, 8000)}`;

/** 拉取 GitHub 仓库 README（带鉴权，失败返回 null） */
export async function fetchReadme(repo: string): Promise<string | null> {
  if (!repo || !repo.includes("/")) return null;
  const headers: Record<string, string> = {
    accept: "application/vnd.github.raw+json",
    "user-agent": "hackcv-ingest/1.0 (+https://ai.hackcv.com)",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers,
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/** 为单条 paper/project 生成结构化解读；非这两类或生成失败返回 null */
export async function interpretItem(item: Item): Promise<Interpretation | null> {
  if (item.type !== "paper" && item.type !== "project") return null;

  let readme = "";
  if (item.type === "project") {
    const repo = item.projectFields?.repo;
    readme = (await fetchReadme(repo || "")) || "";
  }

  const prompt =
    item.type === "paper"
      ? PAPER_PROMPT(item)
      : PROJECT_PROMPT(item, readme);

  const res = await completeJson(prompt, {
    system: "你是 AI 资讯中文解读编辑，只输出 JSON，不解释。",
    maxTokens: 900,
  });
  if (!res || !res.obj) return null;

  const obj = res.obj;
  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const fields: Record<string, string | string[]> = {};
  for (const k of Object.keys(obj)) {
    if (k === "summary") continue;
    const v = obj[k];
    if (typeof v === "string" || Array.isArray(v)) fields[k] = v;
  }
  if (Object.keys(fields).length === 0) return null;

  return {
    kind: item.type,
    summary,
    fields,
    generatedAt: new Date().toISOString(),
    provider: res.provider,
  };
}
