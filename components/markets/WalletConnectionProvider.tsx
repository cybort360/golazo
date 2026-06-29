"use client";
import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { CLUSTER } from "@/lib/chain/constants";
import "@solana/wallet-adapter-react-ui/styles.css";

// Devnet wallet context (Phantom + Solflare). Client-only by directive; mounted
// via a dynamic(ssr:false) wrapper so wallet detection never runs on the server.
export default function WalletConnectionProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl(CLUSTER), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
