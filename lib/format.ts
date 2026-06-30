// Shared display formatters.

export function formatPrice(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1)
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toFixed(8).replace(/0+$/, "")}`;
  return "$0.00";
}

export function compactUsd(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

// Format a SOL amount with precision that scales to the size. Small balances
// (an early prize pool of, say, 0.01 SOL) keep their cents instead of rounding
// to "0.0 SOL"; larger amounts stay clean.
export function formatSol(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 SOL";
  if (n < 1) return `${n.toFixed(2)} SOL`; // 0.01, 0.42
  if (n < 1000) return `${n.toFixed(1)} SOL`; // 12.3
  return `${Math.round(n).toLocaleString("en-US")} SOL`;
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "-";
  // Show cents for small amounts so a few-dollar pool doesn't round to "$0".
  const maximumFractionDigits = Math.abs(n) < 100 ? 2 : 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  });
}

export function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function shortenAddress(addr: string, lead = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}
