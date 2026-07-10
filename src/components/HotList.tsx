import Link from "next/link";
import type { Item } from "@/lib/types";

export default function HotList({ items }: { items: Item[] }) {
  return (
    <div className="hot">
      {items.map((it, i) => (
        <Link key={it.id} href={`/items/${it.id}`} className="hot-item">
          <span className="hot-rank">{i + 1}</span>
          <div className="meta">
            <div className="t">{it.title_zh ?? it.title}</div>
            <div className="s">
              {it.sources.length} 信源 · 精选 {it.score} · {it.source}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
