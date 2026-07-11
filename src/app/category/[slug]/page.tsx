import { notFound } from "next/navigation";
import { getItemsByCategory, getCategories } from "@/lib/db/repository";
import ItemCard from "@/components/ItemCard";
import CategoryTabs from "@/components/CategoryTabs";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = getCategories().find((c) => c.slug === params.slug);
  if (!cat) notFound();
  const items = await getItemsByCategory(params.slug, 60);
  const cats = getCategories().map((c) => ({ slug: c.slug, label: c.label }));

  return (
    <>
      <div className="section-title">
        <span className="bar" />
        {cat.label}
        {cat.description && (
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>
            {" "}
            · {cat.description}
          </span>
        )}
      </div>
      <CategoryTabs categories={cats} current={cat.slug} />
      <div className="feed" style={{ marginTop: 12 }}>
        {items.length === 0 && <div className="empty">该分类暂无内容</div>}
        {items.map((it) => (
          <ItemCard key={it.id} item={it} />
        ))}
      </div>
    </>
  );
}
