"use client";

import { useEffect, useState } from "react";
import type { WalletState } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import WalletPanel from "@/components/predict/WalletPanel";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  useEffect(() => {
    void dataSource.getWalletState().then(setWallet);
  }, []);

  if (wallet === null) return <ScreenSkeleton variant="detail" />;

  return <WalletPanel wallet={wallet} />;
}
