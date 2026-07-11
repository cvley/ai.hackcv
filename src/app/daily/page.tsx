export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDaily, getDailies } from "@/lib/db/repository";
import DailyView from "@/components/DailyView";

export const revalidate = 300;

export default async function DailyPage() {
  const dailies = await getDailies(30);
  const today = await getDaily();
  const daily = today ?? dailies[0];
  if (!daily) notFound();

  const idx = dailies.findIndex((d) => d.date === daily.date);
  const prevDate = idx >= 0 && idx < dailies.length - 1 ? dailies[idx + 1].date : undefined;
  const nextDate = idx > 0 ? dailies[idx - 1].date : undefined;

  return <DailyView daily={daily} prevDate={prevDate} nextDate={nextDate} />;
}
