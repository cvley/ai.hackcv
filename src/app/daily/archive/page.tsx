export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDailies } from "@/lib/db/repository";
import { formatDateCN } from "@/lib/utils";

export const revalidate = 300;

export default async function ArchivePage() {
  const dailies = await getDailies(60);
  return (
    <>
      <div className="section-title">
        <span className="bar" />简报存档
      </div>
      <div className="feed">
        {dailies.map((d) => (
          <Link key={d.date} href={`/daily/${d.date}`} className="card">
            <div className="top">
              <span className="badge badge-news">📰 {d.date}</span>
            </div>
            <div className="title">{formatDateCN(d.date)} · {d.stats.totalItems} 条</div>
            <div className="summary">{d.lead?.title ?? "—"}</div>
            <div className="foot">
              <span>预计阅读 {d.stats.readingTime}</span>
              <span>查看简报 →</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
