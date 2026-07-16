export const dynamic = "force-dynamic";

import { getItems } from "@/lib/db/repository";
import InterpretView from "@/components/InterpretView";

export const metadata = { title: "AI 解读 · hackcv" };

export default async function InterpretPage() {
  const [papers, projects] = await Promise.all([
    getItems({ type: "paper", hasInterpretation: true, take: 200 }).then((r) => r.items),
    getItems({ type: "project", hasInterpretation: true, take: 200 }).then((r) => r.items),
  ]);
  return <InterpretView papers={papers} projects={projects} />;
}
