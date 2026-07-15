import type { Metadata } from "next";
import Link from "next/link";
import { getHot } from "@/lib/db/repository";
import { hotness } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "热门",
  description: "hackcv 当前热门内容，按 信源数 × 精选分 × 时间衰减 综合排序。",
};

function timeAgo(iso: string): string {
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return "刚刚";
  if (h < 24) return `${Math.floor(h)} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

export default async function HotPage() {
  const items = await getHot(40);
  return (
    <>
      <div className="section-title">
        <span className="bar" />热门内容
      </div>
      <p className="hot-desc">
        综合热度 = 信源数 × 精选分 × 时间衰减（48 小时半衰期），实时计算并排序。
      </p>
      <div className="hot">
        {items.length === 0 && <div className="hot-empty">暂无热门内容</div>}
        {items.map((it, i) => (
          <Link key={it.id} href={`/items/${it.id}`} className="hot-item">
            <span className="hot-rank">{i + 1}</span>
            <div className="meta">
              <div className="t">{it.title_zh ?? it.title}</div>
              <div className="s">
                {it.sources.length} 信源 · 精选 {it.score} · {it.source} ·{" "}
                {timeAgo(it.publishedAt)} · 热度 {Math.round(hotness(it))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
