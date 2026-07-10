import { getItems, getCategories } from "@/lib/db/repository";
import ItemCard from "@/components/ItemCard";
import CategoryTabs from "@/components/CategoryTabs";

export const revalidate = 300;

export default function AllPage() {
  const feed = getItems({ mode: "all", take: 40 });
  const cats = getCategories().map((c) => ({ slug: c.slug, label: c.label }));

  return (
    <>
      <div className="section-title">
        <span className="bar" />全部动态（含未精选）
      </div>
      <CategoryTabs categories={cats} />
      <div className="feed" style={{ marginTop: 12 }}>
        {feed.items.map((it) => (
          <ItemCard key={it.id} item={it} />
        ))}
      </div>
    </>
  );
}
