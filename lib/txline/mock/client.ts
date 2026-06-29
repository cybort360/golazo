import type {
  TxlineClient,
  TxlineFixture,
  TxlineFinalResult,
  TxlineLiveEvent,
  TxlineMatchState,
  TxlineStateSnapshot,
  TxlineGoal,
} from "@/lib/txline/client";
import {
  COMPETITION,
  FIXTURES,
  findFixture,
  type Phase,
  type ScriptedFixture,
} from "@/lib/txline/mock/worldcup";

function phaseToState(f: ScriptedFixture): TxlineMatchState {
  switch (f.phase) {
    case "finished":
      return f.finalState ?? "FT";
    case "live":
      return "LIVE";
    case "halftime":
      return "HT";
    case "upcoming":
      return "NOT_STARTED";
  }
}

/** Goals visible at the fixture's current point in time. */
function visibleGoals(f: ScriptedFixture): TxlineGoal[] {
  const sorted = [...f.goals].sort((a, b) => a.minute - b.minute);
  if (f.phase === "finished") return sorted;
  if (f.phase === "live" || f.phase === "halftime") {
    const cap = f.liveMinute ?? 0;
    return sorted.filter((g) => g.minute <= cap);
  }
  return [];
}

function score(goals: TxlineGoal[]): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const g of goals) g.team === "home" ? home++ : away++;
  return { home, away };
}

function currentMinute(f: ScriptedFixture): number | null {
  if (f.phase === "finished") return 90;
  if (f.phase === "live" || f.phase === "halftime") return f.liveMinute ?? null;
  return null;
}

function phaseLabel(f: ScriptedFixture): string | null {
  switch (f.phase) {
    case "finished":
      return f.finalState === "VOID" ? "Abandoned" : "Full time";
    case "halftime":
      return "Half time";
    case "live":
      return (f.liveMinute ?? 0) > 45 ? "2nd half" : "1st half";
    case "upcoming":
      return null;
  }
}

function toFixture(f: ScriptedFixture, now: number): TxlineFixture {
  return {
    id: f.id,
    competition: COMPETITION,
    round: f.round,
    kickoffMs: now + f.kickoffOffsetMs,
    lockMs: now + f.lockOffsetMs,
    home: f.home,
    away: f.away,
  };
}

/** Build the deterministic append-only event log up to the fixture's current point. */
function buildEvents(f: ScriptedFixture, now: number): TxlineLiveEvent[] {
  const events: TxlineLiveEvent[] = [];
  const kickoffMs = now + f.kickoffOffsetMs;
  let seq = 0;
  let home = 0;
  let away = 0;
  const state = phaseToState(f);
  const goals = visibleGoals(f);

  const push = (e: Omit<TxlineLiveEvent, "fixtureId" | "seq">) =>
    events.push({ fixtureId: f.id, seq: ++seq, ...e });

  if (f.phase === "upcoming") return events; // nothing has happened yet

  push({ tsMs: kickoffMs, minute: 0, type: "kickoff", state: "LIVE", homeScore: 0, awayScore: 0 });

  const reachedHt =
    f.phase === "finished" || f.phase === "halftime" || (f.phase === "live" && (f.liveMinute ?? 0) >= 45);
  let crossedHt = false;
  const pushHt = () => {
    push({ tsMs: kickoffMs + 45 * 60_000, minute: 45, type: "ht", state: "HT", homeScore: home, awayScore: away });
    if (f.phase !== "halftime") {
      push({ tsMs: kickoffMs + 60 * 60_000, minute: 45, type: "second_half", state: "LIVE", homeScore: home, awayScore: away });
    }
    crossedHt = true;
  };

  for (const g of goals) {
    if (reachedHt && !crossedHt && g.minute > 45) pushHt();
    g.team === "home" ? home++ : away++;
    push({
      tsMs: kickoffMs + g.minute * 60_000,
      minute: g.minute,
      type: "goal",
      state: "LIVE",
      homeScore: home,
      awayScore: away,
      team: g.team,
    });
  }
  if (reachedHt && !crossedHt) pushHt();

  if (f.phase === "finished") {
    if (f.finalState === "VOID") {
      push({ tsMs: kickoffMs + 75 * 60_000, minute: null, type: "void", state: "VOID", homeScore: home, awayScore: away });
    } else {
      push({ tsMs: kickoffMs + 95 * 60_000, minute: 90, type: "ft", state: "FT", homeScore: home, awayScore: away });
    }
  } else if (f.phase === "live") {
    // A state tick so the latest event carries the running clock (not just the
    // last discrete event), so derived `minute` reflects the live minute.
    const m = f.liveMinute ?? null;
    push({ tsMs: kickoffMs + (m ?? 0) * 60_000, minute: m, type: "state", state: "LIVE", homeScore: home, awayScore: away });
  }
  return events;
}

export class MockTxlineClient implements TxlineClient {
  readonly mode = "mock" as const;

  async competitions(): Promise<string[]> {
    return [COMPETITION];
  }

  async fixtures(opts?: { competition?: string }): Promise<TxlineFixture[]> {
    const now = Date.now();
    return FIXTURES.filter((f) => !opts?.competition || opts.competition === COMPETITION).map((f) =>
      toFixture(f, now),
    );
  }

  async fixture(id: string): Promise<TxlineFixture | null> {
    const f = findFixture(id);
    return f ? toFixture(f, Date.now()) : null;
  }

  async state(fixtureId: string): Promise<TxlineStateSnapshot | null> {
    const f = findFixture(fixtureId);
    if (!f) return null;
    const goals = visibleGoals(f);
    const s = score(goals);
    const started = f.phase !== "upcoming";
    return {
      fixtureId: f.id,
      state: phaseToState(f),
      minute: currentMinute(f),
      phaseLabel: phaseLabel(f),
      homeScore: started ? s.home : null,
      awayScore: started ? s.away : null,
      updatedMs: Date.now(),
    };
  }

  async liveEvents(fixtureId: string, sinceSeq = 0): Promise<TxlineLiveEvent[]> {
    const f = findFixture(fixtureId);
    if (!f) return [];
    return buildEvents(f, Date.now()).filter((e) => e.seq > sinceSeq);
  }

  async finalResult(fixtureId: string): Promise<TxlineFinalResult | null> {
    const f = findFixture(fixtureId);
    if (!f || f.phase !== "finished") return null;

    const state = phaseToState(f);
    const s = score(f.goals);
    const lateGoal = f.goals.some((g) => g.minute > 80) ? 1 : 0;
    const btts = s.home > 0 && s.away > 0 ? 1 : 0;

    const stats: Record<string, number> = {
      home_goals: s.home,
      away_goals: s.away,
      total_goals: s.home + s.away,
      btts,
      late_goal: lateGoal,
      ...(f.stats ?? {}),
    };

    const available: Record<string, boolean> = {};
    for (const k of Object.keys(stats)) available[k] = true;
    for (const k of f.unavailable ?? []) available[k] = false;

    return {
      fixtureId: f.id,
      state,
      homeScore: s.home,
      awayScore: s.away,
      goals: [...f.goals].sort((a, b) => a.minute - b.minute),
      stats,
      available,
      payloadRef: `txl_${f.id}_${s.home}${s.away}`,
      merkleRoot: null, // real TxLINE supplies the proof; on-chain track computes its own
      settledAtMs: Date.now() + f.kickoffOffsetMs + 110 * 60_000,
    };
  }
}
