// Feature flags for Golazo Markets (devnet-only on-chain module). All flags are
// public (NEXT_PUBLIC_*) so both server and client can read them. Defaults are
// conservative: Market Mode and on-chain settlement are OFF unless explicitly
// enabled, and mainnet / native-SOL settlement can never be turned on here.

function flag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const MARKET_FLAGS = {
  /** Master switch for the Golazo Markets UI (Free Picks | Market Mode toggle). */
  enableMarketMode: flag(process.env.NEXT_PUBLIC_ENABLE_MARKET_MODE),
  /** Solana cluster. Devnet only for this prototype. */
  solanaCluster: (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet") as "devnet" | "mainnet-beta",
  /** Devnet mock SPL escrow path — the only supported settlement asset today. */
  enableDevnetSplEscrow: flag(process.env.NEXT_PUBLIC_ENABLE_DEVNET_SPL_ESCROW),
  /** Placeholder for a future native-SOL adapter. Hard-disabled in this build. */
  enableNativeSolSettlement: flag(process.env.NEXT_PUBLIC_ENABLE_NATIVE_SOL_SETTLEMENT),
  /** Mainnet markets are never permitted in this prototype. */
  enableMainnetMarkets: flag(process.env.NEXT_PUBLIC_ENABLE_MAINNET_MARKETS),
} as const;

/** True only when devnet markets are safe to render (cluster=devnet, mainnet off). */
export function marketsEnabled(): boolean {
  return (
    MARKET_FLAGS.enableMarketMode &&
    MARKET_FLAGS.solanaCluster === "devnet" &&
    !MARKET_FLAGS.enableMainnetMarkets
  );
}

export const MARKET_DISCLAIMER = "Devnet demo only. No real-money wagering or payouts.";
