// 回填：修正历史 arXiv 条目错误的 paperFields 结构。
// 问题：fetchArxiv 曾把领域存成 `categories` 且缺 `pdfUrl`，
// 导致 paperFields.domains 为 undefined，前端 .join 崩溃。
// 本脚本把 categories 归一为 domains，并按 arxivId 补全 pdfUrl。
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const papers = await prisma.item.findMany({
    where: { type: "paper" },
    select: { id: true, paperFields: true },
  });
  console.log(`读入 paper 条目: ${papers.length}`);

  let changed = 0;
  for (const row of papers) {
    const pf: any = row.paperFields;
    if (!pf || typeof pf !== "object") continue;

    const arxivId = pf.arxivId ?? undefined;
    const domains =
      Array.isArray(pf.domains) && pf.domains.length > 0
        ? pf.domains
        : Array.isArray(pf.categories)
          ? pf.categories
          : [];
    const pdfUrl =
      pf.pdfUrl ?? (arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined);

    const next = {
      arxivId: arxivId ?? null,
      authors: Array.isArray(pf.authors) ? pf.authors : [],
      domains,
      pdfUrl: pdfUrl ?? null,
    };
    const prev = {
      arxivId: pf.arxivId ?? null,
      authors: pf.authors ?? [],
      domains: pf.domains ?? [],
      pdfUrl: pf.pdfUrl ?? null,
    };
    if (JSON.stringify(next) === JSON.stringify(prev)) continue;

    await prisma.item.update({
      where: { id: row.id },
      data: { paperFields: next as any },
    });
    changed++;
  }
  console.log(`已修正 paperFields: ${changed}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
