import Link from "next/link";

type Mode = "footer" | "card" | "mini";

const QR = "/images/wechat/qrcode.jpg";
const SEARCH_BAR = "/images/wechat/search-standard";
const COMBINED = "/images/wechat/scan-search-standard";

export default function WeChatFollow({ mode = "footer" }: { mode?: Mode }) {
  // ── About 页完整卡片 ──
  if (mode === "card") {
    return (
      <section id="wechat" className="wx-card">
        <div className="wx-card-head">
          <span className="wx-ic">💬</span>
          <div>
            <h2>关注 hackcv 公众号</h2>
            <p>每日 AI 精选、行业简报与开源雷达，第一时间推送到你的微信。</p>
          </div>
        </div>

        <div className="wx-card-body">
          <figure className="wx-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={QR} width={140} height={140} alt="hackcv 公众号二维码" loading="lazy" />
            <figcaption>扫码关注</figcaption>
          </figure>

          <div className="wx-steps">
            <p className="wx-step">
              <b>①</b> 打开微信，在顶部搜索框输入 <span className="wx-key">hackcv</span>
            </p>
            <picture>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <source srcSet={`${SEARCH_BAR}.webp`} type="image/webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="wx-searchbar" src={`${SEARCH_BAR}.png`} width={280} height={44} alt="微信搜一搜 hackcv" loading="lazy" />
            </picture>
            <p className="wx-step">
              <b>②</b> 或长按 / 扫码直接关注，不错过每日更新
            </p>
            <p className="wx-tip">在微信内点击「搜一搜」也能发现我们的最新内容。</p>
          </div>
        </div>

        <picture>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <source srcSet={`${COMBINED}.webp`} type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wx-banner" src={`${COMBINED}.png`} width={720} height={262} alt="微信搜一搜与扫码关注 hackcv" loading="lazy" />
        </picture>
      </section>
    );
  }

  // ── 移动端紧凑入口 ──
  if (mode === "mini") {
    return (
      <Link href="/about#wechat" className="wx-mini">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={QR} width={24} height={24} alt="hackcv 公众号" />
        <span>关注公众号</span>
      </Link>
    );
  }

  // ── 全站 Footer 紧凑行 ──
  return (
    <div className="wx-follow">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={QR} width={64} height={64} alt="hackcv 公众号二维码" loading="lazy" />
      <div className="wx-follow-text">
        <p className="wx-follow-title">
          关注 <b>hackcv</b> 公众号
        </p>
        <p className="wx-follow-sub">
          微信搜一搜 <span className="wx-sou">hackcv</span>，每日 AI 精选直达
        </p>
        <Link href="/about#wechat" className="wx-sou-pill">
          微信搜一搜 · hackcv
        </Link>
      </div>
    </div>
  );
}
