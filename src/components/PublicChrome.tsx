"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";

// 前台公共外壳：在 /admin* 路径下完全不渲染（后台使用自己的布局）
export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (p?.startsWith("/admin")) {
    return <>{children}</>;
  }
  return (
    <>
      <Header />
      <main>
        <div className="container">{children}</div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
