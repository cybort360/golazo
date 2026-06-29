"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { ProofReceipt as Receipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import ProofExplorer from "@/components/predict/ProofExplorer";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function ProofExplorerPage({ params }: { params: { pickId: string } }) {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getReceipt(params.pickId).then(setReceipt);
  }, [params.pickId]);

  if (receipt === undefined) return <ScreenSkeleton variant="detail" />;
  if (receipt === null) return notFound();

  return <ProofExplorer receipt={receipt} />;
}
