import { getItemsByTag } from "@/lib/db/repository";
import ItemCard from "@/components/ItemCard";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const items = await getItemsByTag(tag, 60);

  return (
    <>
      <div className="section-title">
        <span className="bar" />#{tag}
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>
          {" "}
          · {items.length} 条相关内容
        </span>
      </div>
      <div className="feed" style={{ marginTop: 12 }}>
        {items.length === 0 && <div className="empty">暂无带该标签的内容</div>}
        {items.map((it) => (
          <ItemCard key={it.id} item={it} />
        ))}
      </div>
    </>
  );
}
