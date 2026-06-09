"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import type { Adapter } from "@solana/wallet-adapter-base";

import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo<Adapter[]>(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen bg-[#f8fafc] text-slate-900">
            <nav className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 md:px-8">
              <Link
                href="/admin"
                className="text-lg font-semibold uppercase tracking-tight text-slate-900"
              >
                Golazo Admin
              </Link>
              <WalletMultiButton />
            </nav>
            <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
              {children}
            </main>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
