import Link from "next/link";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand">
          <Logo size={22} className="logo" /> hackcv
        </Link>
        <nav className="nav">
          <Link href="/">首页</Link>
          <Link href="/all">全部</Link>
          <Link href="/daily">简报</Link>
          <Link href="/hot">热门</Link>
          <Link href="/developers">开发者</Link>
          <Link href="/about">关于</Link>
        </nav>
        <div className="header-spacer" />
        <div className="header-actions">
          <SearchBar />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
