import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/config";
import {
  REDBOOK,
  REDBOOK_UPDATED,
  REDBOOK_VERSION,
  REDBOOK_TOOL_COUNT,
  REDBOOK_PERSON_COUNT,
} from "@/lib/redbook";

export const metadata: Metadata = {
  title: "2026 AI 工具红宝书 · 持续更新",
  description: `精选 ${REDBOOK_TOOL_COUNT}+ 款 2026 年最值得用的 AI 工具，按对话大模型、AI 编程、AI 搜索、图像、视频、音频、办公、Agent 分类整理，持续更新。`,
    keywords: [
    "AI 工具",
    "AI 工具推荐",
    "2026 AI 工具",
    "AI 工具合集",
    "AI 工具红宝书",
    "AI 博主",
    "AI 账号",
    "优质 AI 账号",
    "X AI 账号",
    "微博 AI 博主",
    "ChatGPT",
    "Claude",
    "AI 编程",
    "AI 绘画",
    "AI 视频",
  ],
  openGraph: {
    title: "2026 AI 工具红宝书 · 持续更新",
    description: `精选 ${REDBOOK_TOOL_COUNT}+ 款 2026 年最值得用的 AI 工具，分类整理、持续更新。`,
    url: `${SITE.url}/redbook`,
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "2026 AI 工具红宝书",
  description: "精选 2026 年最值得用的 AI 工具合集，分类整理、持续更新。",
  url: `${SITE.url}/redbook`,
  numberOfItems: REDBOOK_TOOL_COUNT,
  itemListElement: REDBOOK.flatMap((cat) =>
    (cat.tools ?? []).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: t.url,
      description: t.desc,
    })),
  ),
};

export default function RedbookPage() {
  return (
    <div className="redbook">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="rb-hero">
        <div className="rb-badge">📕 持续更新</div>
        <h1>2026 AI 工具红宝书</h1>
        <p className="rb-sub">
          一份认真挑选、长期维护的 AI 工具清单——覆盖对话、编程、搜索、绘画、视频、音频、办公与 Agent，
          帮你在爆炸的 AI 工具里快速找到真正好用的那几个。
        </p>
        <div className="rb-meta">
          <span>🗂 {REDBOOK.length} 大分类</span>
          <span>🧰 {REDBOOK_TOOL_COUNT} 款工具</span>
          {REDBOOK_PERSON_COUNT > 0 && (
            <span>🌟 {REDBOOK_PERSON_COUNT} 位博主</span>
          )}
          <span>🔖 {REDBOOK_VERSION}</span>
          <span>🕒 更新于 {REDBOOK_UPDATED}</span>
        </div>
      </section>

      {/* 分类锚点导航 */}
      <nav className="rb-toc">
        {REDBOOK.map((cat) => (
          <a key={cat.id} href={`#${cat.id}`}>
            <span aria-hidden>{cat.icon}</span>
            {cat.title.split(" · ")[0]}
          </a>
        ))}
      </nav>

      {/* 分类区块 */}
      {REDBOOK.map((cat) => (
        <section key={cat.id} id={cat.id} className="rb-section">
          <div className="rb-sec-head">
            <h2>
              <span className="rb-sec-ic" aria-hidden>
                {cat.icon}
              </span>
              {cat.title}
            </h2>
            {cat.intro && <p className="rb-sec-intro">{cat.intro}</p>}
          </div>

          {cat.tools && (
            <div className="rb-grid">
              {cat.tools.map((t) => (
                <a
                  key={t.name}
                  className="rb-card"
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="rb-card-top">
                    <span className="rb-name">{t.name}</span>
                    {t.hot && <span className="rb-tag-hot">力荐</span>}
                    {t.cn && <span className="rb-tag-cn">国产</span>}
                  </div>
                  <p className="rb-desc">{t.desc}</p>
                  <div className="rb-card-foot">
                    {(t.tags ?? []).map((tag) => (
                      <span key={tag} className="rb-chip">
                        {tag}
                      </span>
                    ))}
                    {t.price && <span className="rb-price">{t.price}</span>}
                  </div>
                </a>
              ))}
            </div>
          )}

          {cat.people && (
            <div className="rb-grid">
              {cat.people.map((p) => (
                <a
                  key={p.handle}
                  className="rb-card rb-person"
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="rb-card-top">
                    <span className="rb-name">{p.name}</span>
                    {p.hot && <span className="rb-tag-hot">力荐</span>}
                    <span className="rb-platform">{p.platform}</span>
                  </div>
                  <div className="rb-handle">{p.handle}</div>
                  <div className="rb-role">{p.role}</div>
                  <p className="rb-desc">{p.desc}</p>
                  <div className="rb-card-foot">
                    {(p.tags ?? []).map((tag) => (
                      <span key={tag} className="rb-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* 结尾：公众号运营引导 */}
      <section className="rb-footer">
        <p className="rb-footer-title">📌 这份红宝书会持续更新</p>
        <p className="rb-footer-text">
          AI 工具日新月异，本页会定期新增、淘汰与调整推荐。收藏本页，或关注公众号获取每次更新。
          发现好用的工具、或觉得某款该上/该下榜，欢迎通过{" "}
          <Link href="/feedback">反馈页</Link> 告诉我们。
        </p>
        <p className="rb-footer-note">
          说明：入选以「真正好用、可直接上手」为标准，不代表商业推广；价格与可用性以各工具官网为准。
        </p>
      </section>
    </div>
  );
}
