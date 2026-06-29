"use client";

import { dataSource } from "@/lib/predict/dataSource";
import { usePoll } from "@/components/predict/usePoll";
import { ScreenSkeleton } from "@/components/predict/Skeleton";
import HomeDashboard from "@/components/predict/HomeDashboard";
import HomeDashboardDesktop from "@/components/predict/HomeDashboardDesktop";

export default function Home() {
  const data = usePoll(async () => {
    const [matches, leagues, receipts] = await Promise.all([
      dataSource.getMatches(),
      dataSource.getMyLeagues(),
      dataSource.getRecentReceipts(2),
    ]);
    return { matches, leagues, receipts };
  });

  if (!data) return <ScreenSkeleton variant="list" />;

  return (
    <>
      {/* mobile (<lg) */}
      <HomeDashboard matches={data.matches} leagues={data.leagues} receipts={data.receipts} />
      {/* desktop (lg+) */}
      <HomeDashboardDesktop matches={data.matches} leagues={data.leagues} receipts={data.receipts} />
    </>
  );
}
