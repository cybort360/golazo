// Pure mappers: real TxLINE API payloads → our provider-agnostic seam types
// (lib/txline/client.ts). Kept free of fetch/server-only so they're unit-tested
// against sample payloads from the OpenAPI spec (docs.yaml v1.5.2).
//
// Schema references (TxLINE OpenAPI #/components/schemas):
//   Fixture, Scores, SoccerFixtureScore, SoccerTotalScore, SoccerScore,
//   SoccerData, ScoresStatValidation, ScoreStat.
import type {
  TxlineFixture,
  TxlineLiveEvent,
  TxlineEventType,
  TxlineMatchState,
  TxlineStateSnapshot,
  TxlineFinalResult,
  TxlineGoal,
  TxlineTeam,
} from "@/lib/txline/client";

// ---- raw shapes (subset of the TxLINE schema we consume) --------------------

export interface RawFixture {
  Ts: number;
  StartTime: number;
  Competition: string;
  CompetitionId: number;
  Participant1Id: number;
  Participant1: string;
  Participant2Id: number;
  Participant2: string;
  FixtureId: number;
  Participant1IsHome: boolean;
}

export interface RawSoccerScore {
  Goals: number;
  YellowCards: number;
  RedCards: number;
  Corners: number;
}
export interface RawSoccerTotalScore {
  Total?: RawSoccerScore;
  H1?: RawSoccerScore;
  HT?: RawSoccerScore;
  H2?: RawSoccerScore;
}
export interface RawSoccerFixtureScore {
  Participant1: RawSoccerTotalScore;
  Participant2: RawSoccerTotalScore;
}
export interface RawSoccerData {
  Goal?: boolean;
  Corner?: boolean;
  Minutes?: number;
  Participant?: number; // 1 | 2
  Penalty?: boolean;
}
export interface RawScores {
  fixtureId: number;
  gameState: string; // "NS" | "H1" | "HT" | "H2" | "F" | "FET" | ...
  startTime: number;
  participant1IsHome: boolean;
  participant1Id: number;
  participant2Id: number;
  action: string;
  id: number;
  ts: number;
  seq: number;
  confirmed?: boolean;
  scoreSoccer?: RawSoccerFixtureScore;
  dataSoccer?: RawSoccerData;
}

export interface RawScoreStat {
  key: number;
  value: number;
  period: number;
}
export interface RawScoresStatValidation {
  ts: number;
  statToProve: RawScoreStat;
  eventStatRoot: string; // base64 merkle root
}

// ---- helpers ----------------------------------------------------------------

// TxLINE timestamps are int64; tolerate either seconds or milliseconds.
export function toMs(n: number): number {
  return n > 1e12 ? n : n * 1000;
}

const PALETTE = ["#dc2626", "#2563eb", "#0f766e", "#7c3aed", "#16a34a", "#ea580c", "#f59e0b", "#0ea5e9"];
function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// The feed carries full team names + numeric ids but no ticker/flag. Derive a
// stable ticker; flag enrichment is a follow-up (see planning/txline.md).
export function teamFrom(name: string, id: number): TxlineTeam {
  const ticker = name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || `T${id}`;
  return { id: String(id), name, ticker, flagCode: "", color: colorFor(String(id)) };
}

// Game phase → our coarse state. Soccer phase codes per the score-feed encoding.
export function mapState(gameState: string): TxlineMatchState {
  switch (gameState.toUpperCase()) {
    case "NS":
      return "NOT_STARTED";
    case "H1":
    case "H2":
    case "ET1":
    case "ET2":
    case "PE":
      return "LIVE";
    case "HT":
    case "HTET":
      return "HT";
    case "F":
    case "FET":
    case "FPE":
      return "FT";
    case "I": // interrupted
      return "SUSPENDED";
    case "P": // postponed
      return "POSTPONED";
    case "A": // abandoned
    case "C": // cancelled
      return "VOID";
    default:
      return "NOT_STARTED";
  }
}

export function mapFixture(f: RawFixture): TxlineFixture {
  const p1 = teamFrom(f.Participant1, f.Participant1Id);
  const p2 = teamFrom(f.Participant2, f.Participant2Id);
  const home = f.Participant1IsHome ? p1 : p2;
  const away = f.Participant1IsHome ? p2 : p1;
  const kickoffMs = toMs(f.StartTime);
  return {
    id: String(f.FixtureId),
    competition: f.Competition,
    round: f.Competition, // feed has no group/round; reuse competition for now
    kickoffMs,
    lockMs: kickoffMs, // picks lock at kickoff
    home,
    away,
  };
}

// Orient participant1/2 scores to home/away using participant1IsHome.
function scores(s: RawScores): { home: number; away: number; homeCorners: number; awayCorners: number } {
  const p1g = s.scoreSoccer?.Participant1?.Total?.Goals ?? 0;
  const p2g = s.scoreSoccer?.Participant2?.Total?.Goals ?? 0;
  const p1c = s.scoreSoccer?.Participant1?.Total?.Corners ?? 0;
  const p2c = s.scoreSoccer?.Participant2?.Total?.Corners ?? 0;
  return s.participant1IsHome
    ? { home: p1g, away: p2g, homeCorners: p1c, awayCorners: p2c }
    : { home: p2g, away: p1g, homeCorners: p2c, awayCorners: p1c };
}

export function mapStateSnapshot(s: RawScores): TxlineStateSnapshot {
  const sc = scores(s);
  const state = mapState(s.gameState);
  return {
    fixtureId: String(s.fixtureId),
    state,
    minute: s.dataSoccer?.Minutes ?? null,
    phaseLabel: s.gameState || null,
    homeScore: sc.home,
    awayScore: sc.away,
    updatedMs: toMs(s.ts),
  };
}

function eventType(s: RawScores, state: TxlineMatchState): TxlineEventType {
  if (s.dataSoccer?.Goal) return "goal";
  switch (state) {
    case "HT":
      return "ht";
    case "FT":
      return "ft";
    case "VOID":
      return "void";
    default:
      // first live update after NS reads as kickoff; otherwise a state tick
      return s.gameState.toUpperCase() === "H1" ? "kickoff" : "state";
  }
}

export function mapEvent(s: RawScores): TxlineLiveEvent {
  const sc = scores(s);
  const state = mapState(s.gameState);
  const team: "home" | "away" | undefined = s.dataSoccer?.Goal
    ? (s.dataSoccer.Participant === 1) === s.participant1IsHome
      ? "home"
      : "away"
    : undefined;
  return {
    fixtureId: String(s.fixtureId),
    seq: s.seq,
    tsMs: toMs(s.ts),
    minute: s.dataSoccer?.Minutes ?? null,
    type: eventType(s, state),
    state,
    homeScore: sc.home,
    awayScore: sc.away,
    ...(team ? { team } : {}),
    payload: { action: s.action, id: s.id, gameState: s.gameState },
  };
}

// Build the verified final result from the final snapshot, the goal events (for
// the chaos market), and an optional stat-validation proof.
export function mapFinalResult(
  snapshot: RawScores,
  goalEvents: RawScores[],
  proof?: RawScoresStatValidation | null,
): TxlineFinalResult {
  const sc = scores(snapshot);
  const goals: TxlineGoal[] = goalEvents
    .filter((e) => e.dataSoccer?.Goal && typeof e.dataSoccer.Minutes === "number")
    .map((e) => ({
      minute: e.dataSoccer!.Minutes as number,
      team: ((e.dataSoccer!.Participant === 1) === e.participant1IsHome ? "home" : "away") as "home" | "away",
    }));

  const cornersReliable = (sc.homeCorners ?? 0) + (sc.awayCorners ?? 0) > 0;
  const stats: Record<string, number> = {
    home_goals: sc.home,
    away_goals: sc.away,
    home_corners: sc.homeCorners,
    away_corners: sc.awayCorners,
  };
  const available: Record<string, boolean> = {
    winner: true,
    totals: true,
    btts: true,
    corners: cornersReliable,
    chaos: goalEvents.length > 0, // need the goal-event trail to judge "after 80'"
  };

  return {
    fixtureId: String(snapshot.fixtureId),
    state: mapState(snapshot.gameState),
    homeScore: sc.home,
    awayScore: sc.away,
    goals,
    stats,
    available,
    payloadRef: proof ? `stat:${proof.statToProve.key}@${proof.ts}` : `fixture:${snapshot.fixtureId}@${snapshot.ts}`,
    merkleRoot: proof?.eventStatRoot ?? null,
    settledAtMs: toMs(proof?.ts ?? snapshot.ts),
  };
}
