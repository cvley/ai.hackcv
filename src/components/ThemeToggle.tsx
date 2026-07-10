"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

// 三态主题：浅色 / 深色 / 跟随系统（重构方案 §13 优点9）
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("hackcv-theme") as Theme | null) ?? "system";
    setTheme(saved);
  }, []);

  function cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    localStorage.setItem("hackcv-theme", next);
    const dark = next === "dark" || (next === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }

  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️";
  return (
    <button className="theme-toggle" onClick={cycle} title={`主题：${theme}`} aria-label="切换主题">
      {icon}
    </button>
  );
}
