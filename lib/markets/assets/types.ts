// Settlement-asset abstraction. Today the only live asset is a devnet mock SPL
// token ("GOLAZO credits"). The interface is shaped so a future native-SOL (or
// other approved) asset can be dropped in after legal/compliance review without
// rewriting market logic. Anything above this line stays asset-agnostic.

export type AssetKind = "spl" | "native-sol";

export interface AssetDescriptor {
  kind: AssetKind;
  /** Display symbol, e.g. "GOLAZO". */
  symbol: string;
  /** Human label, e.g. "GOLAZO demo credits". */
  label: string;
  /** On-chain decimals (6 for the mock SPL). */
  decimals: number;
  /** Mint address for SPL assets; undefined for native SOL. */
  mint?: string;
  /** Whether staking/claiming is implemented for this asset in this build. */
  implemented: boolean;
}

/** The devnet mock SPL token — demo market credits only. */
export const GOLAZO_SPL: AssetDescriptor = {
  kind: "spl",
  symbol: "GOLAZO",
  label: "GOLAZO demo credits",
  decimals: 6,
  mint: process.env.NEXT_PUBLIC_GOLAZO_MINT,
  implemented: true,
};

/** Placeholder for a future native-SOL settlement asset. Not implemented. */
export const NATIVE_SOL: AssetDescriptor = {
  kind: "native-sol",
  symbol: "SOL",
  label: "Native SOL (not enabled)",
  decimals: 9,
  implemented: false,
};

/** Convert a base-unit bigint to a human number (e.g. 1_500_000 -> 1.5 GOLAZO). */
export function formatAmount(baseUnits: bigint, decimals: number, maxFractionDigits = 2): string {
  const negative = baseUnits < 0n;
  const abs = negative ? -baseUnits : baseUnits;
  const denom = 10n ** BigInt(decimals);
  const whole = abs / denom;
  const frac = abs % denom;
  let fracStr = frac.toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return fracStr.length > 0 ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
}

/** Parse a human amount string (e.g. "1.5") into base units. Throws on bad input. */
export function parseAmount(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(`invalid amount: ${input}`);
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) throw new Error(`too many decimals (max ${decimals})`);
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
}
