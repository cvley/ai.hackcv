import { notFound } from "next/navigation";
import { getDaily, getDailies } from "@/lib/db/repository";
import DailyView from "@/components/DailyView";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function DailyDatePage({ params }: { params: { date: string } }) {
  const daily = await getDaily(params.date);
  if (!daily) notFound();

  const dailies = await getDailies(60);
  const idx = dailies.findIndex((d) => d.date === daily.date);
  const prevDate = idx >= 0 && idx < dailies.length - 1 ? dailies[idx + 1].date : undefined;
  const nextDate = idx > 0 ? dailies[idx - 1].date : undefined;

  return <DailyView daily={daily} prevDate={prevDate} nextDate={nextDate} />;
}
