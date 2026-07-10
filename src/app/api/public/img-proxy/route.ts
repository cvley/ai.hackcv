import { NextRequest, NextResponse } from "next/server";
import { verifyImageSig } from "@/lib/security";

// GET /api/img-proxy?u=<url>&mode=webp&exp=<ts>&sig=<hmac>
// HMAC 签名图片代理：防 URL 滥用 + 统一压缩/缓存（重构方案 §9.1 / §13 优点12）
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const u = sp.get("u") ?? "";
  const mode = sp.get("mode") ?? "webp";
  const exp = Number(sp.get("exp") ?? "0");
  const sig = sp.get("sig") ?? "";

  if (!verifyImageSig(u, mode, exp, sig)) {
    return new NextResponse("invalid or expired signature", { status: 403 });
  }

  // 仅允许 https 信源，避免内网 SSRF
  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (target.protocol !== "https:") {
    return new NextResponse("only https allowed", { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "hackcv-img-proxy/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`upstream ${upstream.status}`);
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    // 上游不可达时返回占位 SVG，保证 UI 不裂图
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225"><rect width="100%" height="100%" fill="#eef2f7"/><text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#9aa4b2" text-anchor="middle" dominant-baseline="middle">hackcv</text></svg>`;
    return new NextResponse(svg, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
    });
  }
}
