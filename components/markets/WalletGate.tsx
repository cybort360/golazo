"use client";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// SSR-safe mount of the wallet context. Wallet adapters touch window/browser
// extensions, so the whole provider is loaded with ssr:false.
const WalletConnectionProvider = dynamic(
  () => import("@/components/markets/WalletConnectionProvider"),
  { ssr: false },
);

export default function WalletGate({ children }: { children: ReactNode }) {
  return <WalletConnectionProvider>{children}</WalletConnectionProvider>;
}
