// Pure mappers: real TxLINE API payloads → our provider-agnostic seam types
// (lib/txline/client.ts). Kept free of fetch/server-only so they're unit-tested.
//
// IMPORTANT: these map the *live* devnet API (probed 2026-06-29), which differs
// from the published OpenAPI spec:
//   - Fixtures (/api/fixtures/snapshot): PascalCase Fixture objects.
//   - Scores (/api/scores/snapshot/{id}): an array with ONE row per action type
//     (goal, corner, status, possession…), each carrying the full current Stats
//     map. It is NOT a time-ordered event log. GameState is unreliable (often
//     stuck at "scheduled"); the real phase is the `status` action's StatusId.
//     Scores live in Stats keyed by number: "1"=P1 goals, "2"=P2 goals,
//     "7"=P1 corners, "8"=P2 corners (period*1000+base for per-half).
import type {
  TxlineFixture,
  TxlineLiveEvent,
  TxlineMatchState,
  TxlineStateSnapshot,
  TxlineFinalResult,
  TxlineTeam,
} from "@/lib/txline/client";

// ---- fixtures ---------------------------------------------------------------

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

// ---- scores snapshot rows ---------------------------------------------------

export interface RawScoreRow {
  FixtureId: number;
  GameState?: string;
  StartTime?: number;
  Participant1IsHome: boolean;
  Participant1Id?: number;
  Participant2Id?: number;
  Action?: string;
  Id?: number;
  Ts: number;
  Seq: number;
  Data?: Record<string, any>;
  Stats?: Record<string, number>;
}

function isRow(x: unknown): x is RawScoreRow {
  return !!x && typeof x === "object" && "FixtureId" in (x as object) && "Seq" in (x as object);
}

// Normalize one SSE frame payload (parsed JSON) into score rows. The updates
// stream may deliver a single row object or a batch array, and providers often
// wrap batches in a `rows`/`data`/`updates`/`items` envelope — tolerate all.
export function coerceRows(json: unknown): RawScoreRow[] {
  if (json == null) return [];
  if (Array.isArray(json)) return json.filter(isRow);
  if (typeof json === "object") {
    if (isRow(json)) return [json as RawScoreRow];
    const o = json as Record<string, unknown>;
    for (const key of ["rows", "data", "updates", "items"]) {
      if (Array.isArray(o[key])) return (o[key] as unknown[]).filter(isRow);
    }
  }
  return [];
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

// Soccer status id (status action Data.StatusId) → our coarse state.
// IDs per the score-feed encoding: 1=NS, 2=H1, 3=HT, 4=H2, 5=F(ended),
// 7=ET1, 8=HTET, 9=ET2, 10=FET, 12=PE, 13=FPE.
export function statusIdToState(id: number | undefined): TxlineMatchState {
  switch (id) {
    case 2:
    case 4:
    case 7:
    case 9:
    case 12:
      return "LIVE";
    case 3:
    case 8:
      return "HT";
    case 5:
    case 10:
    case 13:
      return "FT";
    case 1:
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

// ---- snapshot derivation ----------------------------------------------------

function maxBy<T>(rows: T[], key: (r: T) => number): T | undefined {
  return rows.length ? rows.reduce((a, b) => (key(b) > key(a) ? b : a)) : undefined;
}

// Current state from the per-action snapshot rows.
export function deriveState(rows: RawScoreRow[]): {
  state: TxlineMatchState;
  homeGoals: number;
  awayGoals: number;
  homeCorners: number;
  awayCorners: number;
  hasStats: boolean;
  minute: number | null;
  seq: number;
  tsMs: number;
  p1IsHome: boolean;
} {
  const p1IsHome = rows[0]?.Participant1IsHome ?? true;

  // phase: latest `status` action's StatusId
  const statusRow = maxBy(rows.filter((r) => r.Action === "status" && r.Data?.StatusId != null), (r) => r.Seq);
  const state = statusIdToState(statusRow?.Data?.StatusId);

  // scores: latest row carrying a Stats map with goal keys
  const statsRow = maxBy(rows.filter((r) => r.Stats && (r.Stats["1"] != null || r.Stats["2"] != null)), (r) => r.Seq);
  const s = statsRow?.Stats ?? {};
  const p1g = s["1"] ?? 0;
  const p2g = s["2"] ?? 0;
  const p1c = s["7"] ?? 0;
  const p2c = s["8"] ?? 0;

  // minute: latest clock we can find (Data.New.Clock.Seconds or Data.Clock.Seconds)
  const clockSecs = rows
    .map((r) => r.Data?.New?.Clock?.Seconds ?? r.Data?.Clock?.Seconds)
    .filter((n): n is number => typeof n === "number");
  const minute = clockSecs.length ? Math.floor(Math.max(...clockSecs) / 60) : null;

  const seq = maxBy(rows, (r) => r.Seq)?.Seq ?? 0;
  const tsMs = toMs(maxBy(rows, (r) => r.Ts)?.Ts ?? Date.now());

  return {
    state,
    homeGoals: p1IsHome ? p1g : p2g,
    awayGoals: p1IsHome ? p2g : p1g,
    homeCorners: p1IsHome ? p1c : p2c,
    awayCorners: p1IsHome ? p2c : p1c,
    hasStats: !!statsRow,
    minute,
    seq,
    tsMs,
    p1IsHome,
  };
}

export function mapStateSnapshot(rows: RawScoreRow[]): TxlineStateSnapshot | null {
  if (rows.length === 0) return null;
  const d = deriveState(rows);
  return {
    fixtureId: String(rows[0].FixtureId),
    state: d.state,
    minute: d.minute,
    phaseLabel: d.state,
    homeScore: d.homeGoals,
    awayScore: d.awayGoals,
    updatedMs: d.tsMs,
  };
}

// Synthesize a single current-state event so the append-only ingest records the
// latest score/state (keyed by snapshot seq, idempotent). The full event trail
// (incl. goal minutes for the chaos market) needs the SSE stream — follow-up.
export function snapshotToEvents(rows: RawScoreRow[], sinceSeq?: number): TxlineLiveEvent[] {
  if (rows.length === 0) return [];
  const d = deriveState(rows);
  if (sinceSeq !== undefined && d.seq <= sinceSeq) return [];
  const type = d.state === "FT" ? "ft" : d.state === "HT" ? "ht" : d.state === "NOT_STARTED" ? "state" : "state";
  return [
    {
      fixtureId: String(rows[0].FixtureId),
      seq: d.seq,
      tsMs: d.tsMs,
      minute: d.minute,
      type,
      state: d.state,
      homeScore: d.homeGoals,
      awayScore: d.awayGoals,
      payload: { source: "snapshot" },
    },
  ];
}

export function mapFinalResult(rows: RawScoreRow[]): TxlineFinalResult | null {
  if (rows.length === 0) return null;
  const d = deriveState(rows);
  if (d.state !== "FT") return null;

  const stats: Record<string, number> = {
    home_goals: d.homeGoals,
    away_goals: d.awayGoals,
    home_corners: d.homeCorners,
    away_corners: d.awayCorners,
  };
  const available: Record<string, boolean> = {
    winner: true,
    totals: true,
    btts: true,
    corners: d.homeCorners + d.awayCorners > 0,
    chaos: false, // goal minutes unavailable from snapshot (needs stream/historical)
  };
  return {
    fixtureId: String(rows[0].FixtureId),
    state: "FT",
    homeScore: d.homeGoals,
    awayScore: d.awayGoals,
    goals: [],
    stats,
    available,
    payloadRef: `fixture:${rows[0].FixtureId}@${d.seq}`,
    merkleRoot: null,
    settledAtMs: d.tsMs,
  };
}
