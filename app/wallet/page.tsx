"use client";

import { useEffect, useState } from "react";
import type { WalletState } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import WalletPanel from "@/components/predict/WalletPanel";

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  useEffect(() => {
    void dataSource.getWalletState().then(setWallet);
  }, []);

  if (wallet === null) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;

  return <WalletPanel wallet={wallet} />;
}
