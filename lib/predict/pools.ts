import type { PrizeKind } from "@/lib/predict/types";

const PRIZE_LABELS: Record<PrizeKind, string> = {
  merch: "Merch",
  access: "Access",
  perk: "Perk",
};

export function prizeKindLabel(kind: PrizeKind): string {
  return PRIZE_LABELS[kind];
}

// Compact "closes in" hint. `now` is injectable so it can be unit-tested.
export function formatCloses(closesAtMs: number, now: number = Date.now()): string {
  const ms = closesAtMs - now;
  if (ms <= 0) return "Closed";
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `Closes in ${days}d`;
  if (hours >= 1) return `Closes in ${hours}h`;
  return `Closes in ${mins}m`;
}
