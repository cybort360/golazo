"use client";

import { useEffect, useState } from "react";
import type { SponsoredPool } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import PoolsMobile from "@/components/predict/PoolsMobile";
import PoolsDesktop from "@/components/predict/PoolsDesktop";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function PoolsPage() {
  const [pools, setPools] = useState<SponsoredPool[] | null>(null);
  useEffect(() => {
    void dataSource.getSponsoredPools().then(setPools);
  }, []);

  if (pools === null) return <ScreenSkeleton variant="list" />;

  return (
    <>
      <PoolsMobile pools={pools} />
      <PoolsDesktop pools={pools} />
    </>
  );
}
