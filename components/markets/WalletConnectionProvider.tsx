"use client";
import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { RPC_ENDPOINT } from "@/lib/chain/constants";
import "@solana/wallet-adapter-react-ui/styles.css";

// Devnet wallet context (Phantom + Solflare). Client-only by directive; mounted
// via a dynamic(ssr:false) wrapper so wallet detection never runs on the server.
export default function WalletConnectionProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => RPC_ENDPOINT, []);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
