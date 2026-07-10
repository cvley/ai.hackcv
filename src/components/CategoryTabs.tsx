"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface CatLink {
  slug: string;
  label: string;
}

export default function CategoryTabs({
  categories,
  current,
}: {
  categories: CatLink[];
  current?: string;
}) {
  const path = usePathname();
  const isAll = path === "/all" || path.startsWith("/category");
  return (
    <div className="tabs">
      <Link href="/all" className={isAll ? "active" : ""}>
        全部
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/category/${c.slug}`}
          className={current === c.slug ? "active" : ""}
        >
          {c.label}
        </Link>
      ))}
    </div>
  );
}
