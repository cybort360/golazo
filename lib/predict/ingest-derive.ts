// Pure helpers for ingestion (kept out of the server-only chain so they're unit
// testable). The current match state is derived from the latest event in the
// append-only log — replay yields the same state.

export interface EventPatch {
  seq: number;
  state: string; // TxLINE state string as stored on the event row
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

export function latestEventPatch(
  events: EventPatch[],
): { status: string; minute: number | null; homeScore: number | null; awayScore: number | null } | null {
  if (events.length === 0) return null;
  const last = events.reduce((a, b) => (b.seq > a.seq ? b : a));
  return {
    status: last.state,
    minute: last.minute,
    homeScore: last.homeScore,
    awayScore: last.awayScore,
  };
}
