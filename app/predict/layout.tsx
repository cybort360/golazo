"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import type { Adapter } from "@solana/wallet-adapter-base";

import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

// Wallet context just for the prediction game (so the wallet libs don't load on
// every public page). Sits inside the root layout, so the site nav still wraps it.
export default function PredictLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo<Adapter[]>(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* autoConnect is required for the modal's wallet-select to actually
          connect with our custom trigger. It only re-establishes a connection
          the user has already approved, and the app can only ever sign a
          message (never a transaction), so there's no drain risk. */}
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
