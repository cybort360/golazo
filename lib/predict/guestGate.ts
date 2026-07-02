// Guest gating (single source of truth). Guests (ghosts) can make Free Picks,
// see receipts, view their picks and *view* the leaderboard — but are excluded
// from Market Mode, global leaderboard ranking, and leagues, and are nudged to
// create an account. Accounts (isGhost=false) can do everything.

export interface GuestCapabilities {
  canMarketMode: boolean;
  canLeagues: boolean;
  rankedGlobally: boolean;
}

/** Pure capability predicate for a viewer, given whether they're a guest. */
export function guestGate(isGuest: boolean): GuestCapabilities {
  return {
    canMarketMode: !isGuest,
    canLeagues: !isGuest,
    rankedGlobally: !isGuest,
  };
}

export const GUEST_GATE_MESSAGE =
  "Create an account to save your picks across devices and unlock leagues, the global leaderboard, and Market Mode.";
