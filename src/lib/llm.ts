import type { Item } from "./types";
import { computeScore } from "./scoring";

export interface ScoreResult {
  score: number; // 0-100 精选分
  summary?: string; // 中文摘要（若原文无）
  title_zh?: string; // 中文标题（若原文为英文）
  tags?: string[]; // 中文标签
  provider?: string; // 实际打分的供应商（调试/统计用）
  usage?: TokenUsage; // 本次调用的 token 消耗
}

export interface TokenUsage {
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// OpenAI 兼容供应商预设（base URL + env 变量名 + 默认模型）
export interface OaiProvider {
  id: string;
  label: string;
  baseURL: string;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
}

export const ANTHROPIC_LABEL = "Anthropic Claude";

// 优先级：Anthropic → 以下 OpenAI 兼容供应商（按数组顺序）。
// 新增供应商只需在数组里加一项，无需改其它代码。
export const OAIC_PROVIDERS: OaiProvider[] = [
  { id: "openai", label: "OpenAI", baseURL: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL", defaultModel: "gpt-4o-mini" },
  { id: "siliconflow", label: "SiliconFlow 硅基流动", baseURL: "https://api.siliconflow.cn/v1", apiKeyEnv: "SILICONFLOW_API_KEY", modelEnv: "SILICONFLOW_MODEL", defaultModel: "deepseek-ai/DeepSeek-V3" },
  { id: "deepseek", label: "DeepSeek", baseURL: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY", modelEnv: "DEEPSEEK_MODEL", defaultModel: "deepseek-chat" },
  { id: "moonshot", label: "Moonshot Kimi", baseURL: "https://api.moonshot.cn/v1", apiKeyEnv: "MOONSHOT_API_KEY", modelEnv: "MOONSHOT_MODEL", defaultModel: "moonshot-v1-8k" },
  { id: "zhipu", label: "Zhipu GLM", baseURL: "https://open.bigmodel.cn/api/paas/v4", apiKeyEnv: "ZHIPU_API_KEY", modelEnv: "ZHIPU_MODEL", defaultModel: "glm-4-flash" },
  { id: "dashscope", label: "Qwen DashScope", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", apiKeyEnv: "DASHSCOPE_API_KEY", modelEnv: "DASHSCOPE_MODEL", defaultModel: "qwen-plus" },
  { id: "openrouter", label: "OpenRouter", baseURL: "https://openrouter.ai/api/v1", apiKeyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", defaultModel: "openai/gpt-4o-mini" },
];

type ProviderDef =
  | { kind: "anthropic"; id: string; label: string; apiKeyEnv: string }
  | (OaiProvider & { kind: "oaic" });

// 按优先级返回当前已配置 key 的供应商列表
function enabledProviders(): ProviderDef[] {
  const list: ProviderDef[] = [];
  if (process.env.ANTHROPIC_API_KEY)
    list.push({ kind: "anthropic", id: "anthropic", label: ANTHROPIC_LABEL, apiKeyEnv: "ANTHROPIC_API_KEY" });
  for (const p of OAIC_PROVIDERS)
    if (process.env[p.apiKeyEnv]) list.push({ kind: "oaic", ...p });
  return list;
}

// 未配置任何 key 或调用全部失败 → 降级到 lib/scoring.ts 的启发式 computeScore，保证永远可运行。
export async function scoreItem(partial: Partial<Item>): Promise<ScoreResult> {
  const text = `${partial.title || ""}\n${partial.summary || ""}`.trim();
  const providers = enabledProviders();
  if (providers.length === 0) {
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

  // 依次尝试各供应商，任一成功即用；全部失败则降级启发式。
  for (const p of providers) {
    try {
      const res =
        p.kind === "anthropic"
          ? await callAnthropic(process.env.ANTHROPIC_API_KEY as string, prompt)
          : await callOaic(p, process.env[p.apiKeyEnv] as string, prompt);
      if (res && typeof res.score === "number" && res.score >= 0 && res.score <= 100) {
        return { ...res, provider: p.label };
      }
    } catch {
      /* 试下一个供应商 */
    }
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
  const u = d?.usage;
  const usage: TokenUsage | undefined = u
    ? {
        provider: "anthropic",
        promptTokens: Number(u.input_tokens) || 0,
        completionTokens: Number(u.output_tokens) || 0,
        totalTokens: (Number(u.input_tokens) || 0) + (Number(u.output_tokens) || 0),
      }
    : undefined;
  const res = txt ? extractJson(txt) : null;
  return res ? { ...res, usage } : null;
}

// 通用 OpenAI 兼容调用（SiliconFlow / DeepSeek / Moonshot / Zhipu / Qwen / OpenRouter 等）
async function callOaic(p: OaiProvider, key: string, prompt: string): Promise<ScoreResult | null> {
  const r = await fetch(`${p.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env[p.modelEnv] || p.defaultModel,
      max_tokens: 400,
      messages: [
        { role: "system", content: "你是 AI 资讯精选编辑，只输出 JSON，不解释。" },
        { role: "user", content: prompt },
      ],
    }),
    // 大模型（如 Qwen2.5-72B）完整打分可能 4-8s，给足 15s 余量避免偶发超时降级
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const txt = d?.choices?.[0]?.message?.content;
  const u = d?.usage;
  const usage: TokenUsage | undefined = u
    ? {
        provider: p.id,
        promptTokens: Number(u.prompt_tokens) || 0,
        completionTokens: Number(u.completion_tokens) || 0,
        totalTokens: Number(u.total_tokens) || 0,
      }
    : undefined;
  const res = txt ? extractJson(txt) : null;
  return res ? { ...res, usage } : null;
}

// ============ 供应商可用性检测 ============

export interface ProviderStatus {
  id: string;
  label: string;
  kind: "anthropic" | "oaic";
  configured: boolean; // 是否配置了对应 API Key
  ok?: boolean; // 极简健康 ping 是否成功（仅 configured=true 时有值）
  status?: number; // HTTP 状态码
  latencyMs?: number; // 本次 ping 延迟
  error?: string; // 失败原因
}

// 对所有预设供应商（无论是否配置）返回可用性状态；已配置的做一次极简健康 ping。
export async function listProviderStatus(): Promise<ProviderStatus[]> {
  const defs: ProviderDef[] = [
    { kind: "anthropic", id: "anthropic", label: ANTHROPIC_LABEL, apiKeyEnv: "ANTHROPIC_API_KEY" },
    ...OAIC_PROVIDERS.map((p) => ({ kind: "oaic" as const, ...p })),
  ];
  return Promise.all(
    defs.map(async (d) => {
      const configured = !!process.env[d.apiKeyEnv];
      if (!configured) return { id: d.id, label: d.label, kind: d.kind, configured: false } as ProviderStatus;
      return checkProviderHealth(d);
    }),
  );
}

// 健康探测：优先用免费的 GET /models（不计费、不耗 token）。
// 仅当供应商不支持 /models（404/405）时，才退化到一次极轻量 chat ping（max_tokens:1），
// 绝大多数 OpenAI 兼容端点（含 SiliconFlow）都支持 /models，因此常规检测零成本、也不会触发限流。
async function checkProviderHealth(d: ProviderDef): Promise<ProviderStatus> {
  const t0 = Date.now();
  try {
    const key = process.env[d.apiKeyEnv] as string;
    const modelsUrl =
      d.kind === "anthropic"
        ? "https://api.anthropic.com/v1/models"
        : `${d.baseURL}/models`;
    const headers: Record<string, string> =
      d.kind === "anthropic"
        ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
        : { authorization: `Bearer ${key}` };

    let r = await fetch(modelsUrl, { method: "GET", headers, signal: AbortSignal.timeout(8000) });

    // 供应商无 /models 端点时，退化为一次极轻量 chat ping（仅此情形计费）
    if ((r.status === 404 || r.status === 405) && d.kind === "oaic") {
      r = await fetch(`${d.baseURL}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env[d.modelEnv] || d.defaultModel,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: AbortSignal.timeout(8000),
      });
    }

    const ok = r.ok;
    const latencyMs = Date.now() - t0;
    return {
      id: d.id,
      label: d.label,
      kind: d.kind,
      configured: true,
      ok,
      status: r.status,
      latencyMs,
      error: ok ? undefined : await statusError(r),
    };
  } catch (e) {
    return {
      id: d.id,
      label: d.label,
      kind: d.kind,
      configured: true,
      ok: false,
      error: String(e instanceof Error ? e.message : e),
      latencyMs: Date.now() - t0,
    };
  }
}

// 从非 2xx 响应里提取可读错误（含供应商业务码，如 SiliconFlow 的 50609），
// 让后台「不可用」一栏能直接显示原因，而不是只给一个 HTTP 状态码。
async function statusError(r: Response): Promise<string> {
  try {
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await r.json();
      const msg = (j && (j.message || (j.error && j.error.message) || j.error)) || "";
      const code = j && j.code;
      return [code ? `code ${code}` : "", msg || `HTTP ${r.status}`].filter(Boolean).join(" ");
    }
    const txt = (await r.text()).slice(0, 120);
    return txt || `HTTP ${r.status}`;
  } catch {
    return `HTTP ${r.status}`;
  }
}
