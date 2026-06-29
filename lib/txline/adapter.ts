// TxLINE adapter interface. Today only a mock implementation exists (deterministic
// live events + a resolved binary result per market). Swapping in real TxLINE
// later means implementing this same interface against the live stream + proofs.

export type LiveEventType = "kickoff" | "minute" | "goal" | "ft" | "void";

export interface LiveEvent {
  type: LiveEventType;
  minute: number;
  home: number;
  away: number;
  note?: string;
}

export interface MatchResult {
  matchId: string;
  // Binary stat resolutions keyed by market_id (1 = YES, 0 = NO).
  stats: Record<string, 0 | 1>;
  voided: boolean;
}

export interface TxlineAdapter {
  /** Ordered live events for a match (kickoff → minutes/goals → FT). */
  liveEvents(matchId: string): LiveEvent[];
  /** Final resolved result once the match reaches FT. */
  result(matchId: string): MatchResult;
}

// Deterministic demo script: 2-1 home win, goals at 23' and 67' (home), 81' (away).
const DEMO_GOALS: Record<number, "home" | "away"> = { 23: "home", 67: "home", 81: "away" };

export class MockTxlineAdapter implements TxlineAdapter {
  liveEvents(_matchId: string): LiveEvent[] {
    const events: LiveEvent[] = [{ type: "kickoff", minute: 0, home: 0, away: 0 }];
    let home = 0;
    let away = 0;
    for (let minute = 1; minute <= 90; minute += 1) {
      const goal = DEMO_GOALS[minute];
      if (goal === "home") home += 1;
      if (goal === "away") away += 1;
      events.push({
        type: goal ? "goal" : "minute",
        minute,
        home,
        away,
        note: goal ? `${goal} goal` : undefined,
      });
    }
    events.push({ type: "ft", minute: 90, home, away, note: "full time" });
    return events;
  }

  result(matchId: string): MatchResult {
    const ft = this.liveEvents(matchId).at(-1)!;
    return {
      matchId,
      stats: {
        home_win: ft.home > ft.away ? 1 : 0,
        over25: ft.home + ft.away > 2 ? 1 : 0,
        btts: ft.home > 0 && ft.away > 0 ? 1 : 0,
      },
      voided: false,
    };
  }
}

export const txlineAdapter: TxlineAdapter = new MockTxlineAdapter();
