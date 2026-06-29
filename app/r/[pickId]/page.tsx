"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProofReceipt as Receipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import ProofReceipt from "@/components/predict/ProofReceipt";
import ReceiptDetailDesktop from "@/components/predict/ReceiptDetailDesktop";
import LeagueMovement from "@/components/predict/LeagueMovement";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function ReceiptPage({ params }: { params: { pickId: string } }) {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getReceipt(params.pickId).then(setReceipt);
  }, [params.pickId]);

  if (receipt === undefined) {
    return <ScreenSkeleton variant="detail" />;
  }
  if (receipt === null) return notFound();

  return (
    <>
      {/* mobile (<lg) */}
      <div className="px-4 py-4 lg:hidden">
        <div className="mb-3 flex items-center justify-between text-[13px] font-bold">
          <Link href="/receipts" className="text-slate-500">‹ Back</Link>
          <span className="font-extrabold text-ink">Your receipt</span>
          <span className="w-10" />
        </div>
        <ProofReceipt receipt={receipt} />
        <LeagueMovement pickId={receipt.pickId} />
      </div>
      {/* desktop (lg+) */}
      <ReceiptDetailDesktop receipt={receipt} />
    </>
  );
}
