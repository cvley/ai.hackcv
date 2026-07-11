"use client";
import Link from "next/link";
import { useState } from "react";
import type { Item } from "@/lib/types";
import { cn, formatCount, formatDateTime, hostnameOf, typeLabel } from "@/lib/utils";

const TYPE_BADGE: Record<string, string> = {
  paper: "badge-paper",
  project: "badge-project",
  news: "badge-news",
};

export default function ItemCard({ item, compact = false }: { item: Item; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const long = item.summary.length > 90;
  const summary = long && !open ? item.summary.slice(0, 90) + "…" : item.summary;

  return (
    <article className="card">
      <div className="top">
        <span className={cn("badge", TYPE_BADGE[item.type])}>{typeLabel(item.type)}</span>
        <span className="badge badge-score">精选 {item.score}</span>
        {item.sources.length > 1 && (
          <span className="badge badge-src">{item.sources.length} 信源</span>
        )}
      </div>

      <h3 className="title">
        <Link href={`/items/${item.id}`}>{item.title}</Link>
        {item.title_zh && <span className="zh">· {item.title_zh}</span>}
      </h3>

      <p className="summary">{summary}</p>
      {long && (
        <button className="expand" onClick={() => setOpen((v) => !v)}>
          {open ? "收起 ▲" : "展开全文 ▼"}
        </button>
      )}

      {item.recommendation && !compact && (
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

      {!compact && item.tags.length > 0 && (
        <div className="tags">
          {item.tags.map((t) => (
            <Link key={t} href={`/tag/${encodeURIComponent(t)}`} className="tag">
              #{t}
            </Link>
          ))}
        </div>
      )}

      <div className="foot">
        <span>📎 {item.source}</span>
        <span>🕒 {formatDateTime(item.publishedAt)}</span>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          🔗 {hostnameOf(item.url)}
        </a>
      </div>
    </article>
  );
}
