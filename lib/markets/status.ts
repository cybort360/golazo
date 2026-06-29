// Market status codes mirror the on-chain golazo_predict status byte.
export const MARKET_STATUS = {
  OPEN: 0,
  LOCKED: 1,
  LIVE: 2,
  SETTLING: 3,
  SETTLED: 4,
  VOID: 5,
} as const;

export type MarketStatusCode = (typeof MARKET_STATUS)[keyof typeof MARKET_STATUS];

const LABELS: Record<number, string> = {
  0: "Open",
  1: "Locked",
  2: "Live",
  3: "Settling",
  4: "Settled",
  5: "Void",
};

export function statusLabel(status: number): string {
  return LABELS[status] ?? "Unknown";
}

export function canStake(status: number, lockTs: number, now = Date.now()): boolean {
  return status === MARKET_STATUS.OPEN && now < lockTs * 1000;
}

export function canClaim(status: number): boolean {
  return status === MARKET_STATUS.SETTLED;
}

export function canRefund(status: number): boolean {
  return status === MARKET_STATUS.VOID;
}
