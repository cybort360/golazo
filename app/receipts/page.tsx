"use client";

import { useEffect, useState } from "react";
import type { ProofReceipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import ReceiptsMobile from "@/components/predict/ReceiptsMobile";
import ReceiptsDesktop from "@/components/predict/ReceiptsDesktop";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ProofReceipt[] | null>(null);
  useEffect(() => {
    void dataSource.getRecentReceipts(50).then(setReceipts);
  }, []);

  if (receipts === null) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;

  return (
    <>
      {/* mobile (<lg) */}
      <ReceiptsMobile receipts={receipts} />
      {/* desktop (lg+) */}
      <ReceiptsDesktop receipts={receipts} />
    </>
  );
}
