import { getHot, getItems, getDaily, getCategories } from "@/lib/db/repository";
import HotList from "@/components/HotList";
import ItemCard from "@/components/ItemCard";
import CategoryTabs from "@/components/CategoryTabs";
import DailyDigestCard from "@/components/DailyDigestCard";

export const revalidate = 300;

export default function Home() {
  const hot = getHot(5);
  const feed = getItems({ mode: "selected", take: 20 });
  const daily = getDaily() ?? undefined;
  const cats = getCategories().map((c) => ({ slug: c.slug, label: c.label }));

  return (
    <>
      <div className="section-title">
        <span className="bar" />🔥 今日热点
      </div>
      <HotList items={hot} />

      <div className="section-title">
        <span className="bar" />分类浏览
      </div>
      <CategoryTabs categories={cats} />

      {daily && (
        <div style={{ marginTop: 16 }}>
          <DailyDigestCard daily={daily} />
        </div>
      )}

      <div className="section-title">
        <span className="bar" />精选信息流
      </div>
      <div className="feed">
        {feed.items.map((it) => (
          <ItemCard key={it.id} item={it} />
        ))}
      </div>
    </>
  );
}
