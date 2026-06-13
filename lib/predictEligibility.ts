// Pure pot-eligibility rule for the prediction game's hold-to-enter gate.
// A non-positive (or unset) threshold means the gate is OFF — everyone is
// eligible — which keeps the game fully open before $GOLAZO launches.

export function isPotEligible(
  balance: number | null,
  threshold: number,
): boolean {
  if (!Number.isFinite(threshold) || threshold <= 0) return true; // gate off
  return balance !== null && balance >= threshold;
}
