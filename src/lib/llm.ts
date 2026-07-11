import type { Item } from "./types";
import { computeScore } from "./scoring";

export interface ScoreResult {
  score: number; // 0-100 精选分
  summary?: string; // 中文摘要（若原文无）
  title_zh?: string; // 中文标题（若原文为英文）
  tags?: string[]; // 中文标签
}

// 真实 LLM 打分：
// 优先 Anthropic（ANTHROPIC_API_KEY），其次 OpenAI（OPENAI_API_KEY）。
// 未配置 key 或调用失败 → 降级到 lib/scoring.ts 的启发式 computeScore，保证永远可运行。
export async function scoreItem(partial: Partial<Item>): Promise<ScoreResult> {
  const text = `${partial.title || ""}\n${partial.summary || ""}`.trim();
  const keyA = process.env.ANTHROPIC_API_KEY;
  const keyO = process.env.OPENAI_API_KEY;

  if (!keyA && !keyO) {
    return { score: computeScore(partial as Item) };
  }
  if (!text) {
    return { score: 50 };
  }

  const prompt =
    "你是 AI 资讯精选编辑。请评估下面这条内容的「精选价值」，按 0-100 打分" +
    "（100=必读，80+=强烈推荐，60+=值得看，<60=一般）。\n" +
    "同时：用一句不超过 35 字的中文写摘要（summary）；若标题为英文，给出简短中文标题（title_zh），否则省略；" +
    "提取 1-4 个中文标签（tags，聚焦技术主题）。\n" +
    "只输出 JSON，不要其它文字：{\"score\":<int>,\"summary\":<str>,\"title_zh\":<str|null>,\"tags\":[<str>]}\n\n" +
    "待评估内容：\n" +
    text.slice(0, 1200);

  try {
    const res = keyA
      ? await callAnthropic(keyA, prompt)
      : await callOpenAI(keyO as string, prompt);
    if (res && typeof res.score === "number" && res.score >= 0 && res.score <= 100) {
      return res;
    }
  } catch {
    /* 降级 */
  }
  return { score: computeScore(partial as Item) };
}

function extractJson(raw: string): ScoreResult | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    return {
      score: Number(o.score) || 0,
      summary: typeof o.summary === "string" ? o.summary : undefined,
      title_zh: o.title_zh ? String(o.title_zh) : undefined,
      tags: Array.isArray(o.tags) ? o.tags.map(String).slice(0, 4) : undefined,
    };
  } catch {
    return null;
  }
}

async function callAnthropic(key: string, prompt: string): Promise<ScoreResult | null> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 400,
      system: "你只输出 JSON，不解释。",
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const txt = d?.content?.[0]?.text;
  return txt ? extractJson(txt) : null;
}

async function callOpenAI(key: string, prompt: string): Promise<ScoreResult | null> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是 AI 资讯精选编辑，只输出 JSON。" },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const txt = d?.choices?.[0]?.message?.content;
  return txt ? extractJson(txt) : null;
}
