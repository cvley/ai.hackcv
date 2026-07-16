"use client";
import Link from "next/link";
import { useState } from "react";
import type { Item } from "@/lib/types";
import { formatDateCN } from "@/lib/utils";

function InterpretCard({ item }: { item: Item }) {
  return (
    <Link href={`/items/${item.id}`} className="card interpret-card">
      <div className="top">
        <span className={`badge badge-${item.type}`}>
          {item.type === "paper" ? "论文" : "代码"}
        </span>
        <span className="badge badge-interp">已解读</span>
      </div>
      <h3 className="title">
        {item.title}
        {item.title_zh && <span className="zh">· {item.title_zh}</span>}
      </h3>
      {item.interpretation?.summary && (
        <p className="summary interp-card-summary">{item.interpretation.summary}</p>
      )}
      <div className="foot">
        <span>📎 {item.source}</span>
        <span>🕒 {formatDateCN(item.publishedAt.slice(0, 10))}</span>
      </div>
    </Link>
  );
}

export default function InterpretView({
  papers,
  projects,
}: {
  papers: Item[];
  projects: Item[];
}) {
  const [tab, setTab] = useState<"paper" | "project">("paper");
  const list = tab === "paper" ? papers : projects;

  return (
    <div>
      <div className="section-title">
        <span className="bar" />
        AI 解读
      </div>
      <p className="page-desc">
        由 LLM 对每日入选的 AI 论文与开源项目做结构化中文解读，点卡片看完整内容。
      </p>

      <div className="interpret-tabs">
        <button
          className={tab === "paper" ? "active" : ""}
          onClick={() => setTab("paper")}
        >
          论文解读（{papers.length}）
        </button>
        <button
          className={tab === "project" ? "active" : ""}
          onClick={() => setTab("project")}
        >
          代码解读（{projects.length}）
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty">本板块暂无解读内容（入选的论文/项目会在采集后自动生成解读）</div>
      ) : (
        <div className="feed">
          {list.map((it) => (
            <InterpretCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
