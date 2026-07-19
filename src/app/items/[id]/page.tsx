import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, getItemsByCategory, getCategories, isInternalSource } from "@/lib/db/repository";
import ItemCard from "@/components/ItemCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/config";
import { formatCount, formatDateTime, hostnameOf, typeLabel } from "@/lib/utils";

// 解读结构化字段 → 中文标签（按 kind 区分）
const INTERP_LABELS: Record<string, string> = {
  problem: "要解决的问题",
  method: "核心方法",
  contribution: "主要贡献",
  experiments: "关键实验",
  significance: "意义与局限",
  whoFor: "适合谁读",
  what: "项目简介",
  highlights: "核心亮点",
  techStack: "技术栈",
  useCases: "适用场景",
  whyAi: "与 AI 的关系",
};

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: { id: string } }) {
  const item = await getItem(params.id);
  if (!item) notFound();
  // 内部信源（微博 / X）仅入库用于分析，不对外暴露单条详情
  if (isInternalSource(item.source)) notFound();

  const cat = getCategories().find((c) => c.slug === item.category);
  const related = (await getItemsByCategory(item.category))
    .filter((i) => i.id !== item.id)
    .slice(0, 5);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.summary,
    datePublished: item.publishedAt,
    articleSection: cat?.label ?? typeLabel(item.type),
    keywords: item.tags.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": item.permalink },
  };

  return (
    <div>
      <JsonLd data={articleLd} />
      <div className="section-title">
        <span className="bar" />
        {cat ? (
          <Link href={`/category/${cat.slug}`} style={{ color: "inherit" }}>
            {cat.label}
          </Link>
        ) : (
          typeLabel(item.type)
        )}
      </div>

      <article className="card">
        <div className="top">
          <span className={`badge badge-${item.type}`}>{typeLabel(item.type)}</span>
          <span className="badge badge-score">精选 {item.score}</span>
          {item.sources.map((s) => (
            <span key={s} className="badge badge-src">
              {s}
            </span>
          ))}
        </div>
        <h1 className="title" style={{ fontSize: 22 }}>
          {item.title}
          {item.title_zh && <span className="zh">· {item.title_zh}</span>}
        </h1>
        <p className="summary" style={{ fontSize: 15 }}>
          {item.summary}
        </p>

        {item.recommendation && (
          <div className="rec">
            <span className="lab">推荐理由</span>
            {item.recommendation}
          </div>
        )}

        {item.interpretation && (
          <div className="interpret">
            <span className="lab">
              AI 解读
              <span className="kind">{item.interpretation.kind === "paper" ? "论文" : "代码"}</span>
            </span>
            {item.interpretation.summary && (
              <p className="interpret-summary">{item.interpretation.summary}</p>
            )}
            <dl className="interpret-fields">
              {Object.entries(item.interpretation.fields).map(([k, v]) => (
                <div className="if-row" key={k}>
                  <dt>{INTERP_LABELS[k] ?? k}</dt>
                  <dd>
                    {Array.isArray(v) ? (
                      <span className="if-list">
                        {v.map((x, i) => (
                          <span className="if-item" key={i}>
                            {x}
                          </span>
                        ))}
                      </span>
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {item.projectFields && (
          <div className="metrics">
            <span>
              ⭐ <b>{formatCount(item.projectFields.stars)}</b> stars
            </span>
            {typeof item.projectFields.todayStars === "number" && (
              <span>
                今日 <b>+{formatCount(item.projectFields.todayStars)}</b>
              </span>
            )}
            {item.projectFields.language && (
              <span>语言 {item.projectFields.language}</span>
            )}
            {item.projectFields.license && (
              <span>协议 {item.projectFields.license}</span>
            )}
          </div>
        )}
        {item.paperFields && (
          <div className="metrics">
            {item.paperFields.domains?.length > 0 && (
              <span>领域：{item.paperFields.domains.join("、")}</span>
            )}
            {item.paperFields.authors?.length > 0 && (
              <span>作者：{item.paperFields.authors.join("、")}</span>
            )}
          </div>
        )}

        <div className="tags">
          {item.tags.map((t) => (
            <Link key={t} href={`/tag/${encodeURIComponent(t)}`} className="tag">
              #{t}
            </Link>
          ))}
        </div>

        <div className="foot">
          <span>📎 发布于 {formatDateTime(item.publishedAt)}</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            🔗 阅读原文（{hostnameOf(item.url)}）
          </a>
          {item.paperFields?.pdfUrl && (
            <a href={item.paperFields.pdfUrl} target="_blank" rel="noopener noreferrer">
              📄 PDF
            </a>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <>
          <div className="section-title">
            <span className="bar" />
            相关推荐
          </div>
          <div className="feed">
            {related.map((it) => (
              <ItemCard key={it.id} item={it} compact />
            ))}
          </div>
        </>
      )}

      <p style={{ marginTop: 16, fontSize: 13, color: "var(--faint)" }}>
        本站内容由 LLM 精选聚合，原文版权归{" "}
        <a href={item.url} style={{ color: "var(--primary)" }}>
          {item.source}
        </a>{" "}
        所有 · 摘录仅供参考
      </p>
    </div>
  );
}
