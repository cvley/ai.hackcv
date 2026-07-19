import crypto from "crypto";

export interface FeishuSendResult {
  ok: boolean;
  status?: number;
  error?: string;
}

// 飞书自定义机器人：发送 interactive 卡片
// webhook: https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
// secret:   可选，开启「签名校验」后得到的字符串
export async function postFeishuCard(
  webhook: string,
  secret: string | undefined,
  card: Record<string, unknown>,
): Promise<FeishuSendResult> {
  const body: Record<string, unknown> = { msg_type: "interactive", card };

  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `${timestamp}\n${secret}`;
    // 飞书规范：sign = base64( HMAC-SHA256( key = timestamp+"\n"+secret, 消息为空 ) )
    const sign = crypto
      .createHmac("sha256", stringToSign)
      .digest("base64");
    body.timestamp = timestamp;
    body.sign = sign;
  }

  try {
    const resp = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: text.slice(0, 300) };
    }
    // 飞书即便 HTTP 200 也可能在 body 返回 errcode != 0
    try {
      const j = JSON.parse(text);
      if (j.code !== undefined && j.code !== 0) {
        return { ok: false, status: resp.status, error: text.slice(0, 300) };
      }
    } catch {
      /* 非 JSON 视为成功 */
    }
    return { ok: true, status: resp.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 构建「每日用户反馈」摘要卡片
export function buildFeedbackCard(
  items: { message: string; page: string | null; contact: string | null; createdAt: string }[],
  opts: { siteUrl?: string; date?: string } = {},
): Record<string, unknown> {
  const siteUrl = opts.siteUrl || "https://ai.hackcv.com";
  const adminUrl = `${siteUrl}/admin/feedback`;
  const max = 20;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;

  const elements: Record<string, unknown>[] = [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**${items.length} 条新反馈**${opts.date ? ` · ${opts.date}` : ""}`,
      },
    },
    { tag: "hr" },
  ];

  for (const it of shown) {
    const meta = [
      it.page ? `来源：${it.page}` : null,
      it.contact ? `联系：${it.contact}` : null,
      `时间：${it.createdAt.slice(0, 16).replace("T", " ")}`,
    ]
      .filter(Boolean)
      .join("  ·  ");
    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: `> ${it.message.replace(/\n+/g, " ")}\n> ${meta}`,
      },
    });
    elements.push({ tag: "hr" });
  }

  if (extra > 0) {
    elements.push({
      tag: "div",
      text: { tag: "lark_md", content: `…还有 ${extra} 条，请去后台查看` },
    });
  }

  elements.push({
    tag: "action",
    actions: [
      {
        tag: "button",
        text: { tag: "plain_text", content: "去后台处理" },
        type: "primary",
        url: adminUrl,
      },
    ],
  });

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "hackcv · 每日用户反馈" },
      template: "red",
    },
    elements,
  };
}
