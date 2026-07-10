import { searchItems } from "@/lib/db/repository";
import ItemCard from "@/components/ItemCard";
import type { ItemType } from "@/lib/types";

export const revalidate = 60;

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const type = (searchParams.type as ItemType | undefined) || undefined;

  if (q.length < 2) {
    return (
      <div className="prose">
        <h1>🔍 搜索</h1>
        <p>在 hackcv 中检索 arXiv 论文、GitHub 开源项目与 AI 行业资讯。</p>
        <p>
          在顶部搜索框输入关键词（至少 2 个字符），或使用 API：
          <code>GET /api/public/search?q=大模型</code>
        </p>
      </div>
    );
  }

  const data = searchItems({ q, type, pageSize: 40 });

  return (
    <>
      <div className="section-title">
        <span className="bar" />搜索 “{q}” · {data.count} 条结果
      </div>
      <div className="feed">
        {data.count === 0 && <div className="empty">未找到相关内容，换个关键词试试</div>}
        {data.items.map((it) => (
          <ItemCard key={it.id} item={it} />
        ))}
      </div>
    </>
  );
}
