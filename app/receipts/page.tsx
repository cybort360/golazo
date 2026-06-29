"use client";

import { useEffect, useState } from "react";
import type { ProofReceipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import ReceiptsMobile from "@/components/predict/ReceiptsMobile";
import ReceiptsDesktop from "@/components/predict/ReceiptsDesktop";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ProofReceipt[] | null>(null);
  useEffect(() => {
    void dataSource.getRecentReceipts(50).then(setReceipts);
  }, []);

  if (receipts === null) return <ScreenSkeleton variant="list" />;

  return (
    <>
      {/* mobile (<lg) */}
      <ReceiptsMobile receipts={receipts} />
      {/* desktop (lg+) */}
      <ReceiptsDesktop receipts={receipts} />
    </>
  );
}
