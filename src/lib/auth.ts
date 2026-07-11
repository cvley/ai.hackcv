// 会话令牌：HMAC-SHA256 签名（Web Crypto，edge/node 通用）
// 设计为可在 middleware（edge 运行时）与 route handler（node 运行时）中复用。
import type { SessionPayload } from "./types";

const SECRET =
  process.env.HACKCV_ADMIN_SECRET || "dev-admin-secret-change-me";

// URL-safe Base64 手写实现（避免依赖 atob/btoa 在 edge 的差异）
const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToB64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : "";
    out += i + 2 < bytes.length ? B64[b2 & 63] : "";
  }
  return out;
}

function b64urlToBytes(s: string): Uint8Array {
  const bin = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = bin.length % 4 ? "=".repeat(4 - (bin.length % 4)) : "";
  const b = atob(bin + pad);
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = encodeURIComponent(JSON.stringify(payload));
  const sig = bytesToB64url(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(body)),
    ),
  );
  return `${body}.${sig}`;
}

export async function verifySession(
  token?: string | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const idx = token.indexOf(".");
  if (idx < 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(),
      b64urlToBytes(sig),
      new TextEncoder().encode(body),
    );
    if (!ok) return null;
    const payload = JSON.parse(decodeURIComponent(body)) as SessionPayload;
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
