import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, getItemsByCategory, getCategories } from "@/lib/db/repository";
import ItemCard from "@/components/ItemCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/config";
import { formatCount, formatDateTime, hostnameOf, typeLabel } from "@/lib/utils";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: { id: string } }) {
  const item = await getItem(params.id);
  if (!item) notFound();

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

        {item.projectFields && (
          <div className="metrics">
            <span>
              ⭐ <b>{formatCount(item.projectFields.stars)}</b> stars
            </span>
            <span>
              今日 <b>+{formatCount(item.projectFields.todayStars)}</b>
            </span>
            <span>语言 {item.projectFields.language}</span>
            <span>协议 {item.projectFields.license}</span>
          </div>
        )}
        {item.paperFields && (
          <div className="metrics">
            <span>领域：{item.paperFields.domains.join("、")}</span>
            <span>作者：{item.paperFields.authors.join("、")}</span>
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
          {item.paperFields && (
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
