"use client";

import { useEffect, useState } from "react";
import type { ActivePickGroup } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MyPicks from "@/components/predict/MyPicks";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function PicksPage() {
  const [groups, setGroups] = useState<ActivePickGroup[] | null>(null);
  useEffect(() => {
    void dataSource.getActivePicks().then(setGroups);
  }, []);

  if (groups === null) return <ScreenSkeleton variant="list" />;
  return <MyPicks groups={groups} />;
}
