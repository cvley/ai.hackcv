import Link from "next/link";
import type { Daily } from "@/lib/types";

export default function DailyDigestCard({ daily }: { daily: Daily }) {
  if (!daily) return null;
  const { date, stats } = daily;
  return (
    <Link href={`/daily/${date}`} className="digest">
      <span className="emoji">📰</span>
      <div className="body">
        <div className="h">AI 研究简报 · {date}</div>
        <div className="sub">
          {stats.totalItems} 条 · 论文 / 项目 / 资讯 · 预计阅读 {stats.readingTime}
        </div>
      </div>
      <span className="go">查看完整简报 →</span>
    </Link>
  );
}
