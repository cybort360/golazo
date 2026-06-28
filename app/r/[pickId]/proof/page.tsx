"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { ProofReceipt as Receipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import ProofExplorer from "@/components/predict/ProofExplorer";

export default function ProofExplorerPage({ params }: { params: { pickId: string } }) {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getReceipt(params.pickId).then(setReceipt);
  }, [params.pickId]);

  if (receipt === undefined) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  if (receipt === null) return notFound();

  return <ProofExplorer receipt={receipt} />;
}
