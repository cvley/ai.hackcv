import Link from "next/link";
import type { Daily } from "@/lib/types";
import ItemCard from "./ItemCard";
import { formatDateCN } from "@/lib/utils";

export default function DailyView({
  daily,
  prevDate,
  nextDate,
}: {
  daily: Daily;
  prevDate?: string;
  nextDate?: string;
}) {
  return (
    <div>
      <div className="daily-head">
        <div className="date">📰 AI 研究简报 · {formatDateCN(daily.date)}</div>
        {daily.lead && (
          <div className="lead">
            <b>今日头条：</b>
            {daily.lead.title} —— {daily.lead.summary}
          </div>
        )}
        <div className="stats">
          <span>共 {daily.stats.totalItems} 条</span>
          <span>预计阅读 {daily.stats.readingTime}</span>
          <span>Token 消耗 {daily.stats.tokenCost.toLocaleString()}</span>
        </div>
      </div>

      <div className="daily-nav">
        <span>
          {prevDate ? (
            <Link href={`/daily/${prevDate}`}>← 前一天</Link>
          ) : (
            <span style={{ color: "var(--faint)" }}>已是更早</span>
          )}
        </span>
        <span>
          {nextDate ? (
            <Link href={`/daily/${nextDate}`}>后一天 →</Link>
          ) : (
            <span style={{ color: "var(--faint)" }}>已是最新</span>
          )}
        </span>
      </div>

      <div className="sticky-tabs">
        {daily.sections.map((s) => (
          <a key={s.type} href={`#${s.type}`}>
            {s.label}（{s.items.length}）
          </a>
        ))}
      </div>

      {daily.sections.map((s) => (
        <section key={s.type} id={s.type}>
          <div className="section-title">
            <span className="bar" />
            {s.label}
          </div>
          <div className="feed">
            {s.items.length === 0 && <div className="empty">本板块今日暂无内容</div>}
            {s.items.map((it) => (
              <ItemCard key={it.id} item={it} compact />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
