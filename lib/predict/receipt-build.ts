import type { MatchState, MatchTeam, PickResult, ProofReceipt } from "@/lib/predict/types";

// Pure builder: a settled Prediction (+ its match) → the ProofReceipt the
// existing two-layer receipt UI consumes (simple fan card + advanced proof).

export interface ReceiptInput {
  pickId: string;
  predictionLabel: string;
  marketId: string;
  optionId: string;
  status: PickResult;
  points: number;
  proofRef: string | null;
  settledAtMs: number;
  matchState: string;
  homeScore: number | null;
  awayScore: number | null;
  home: MatchTeam;
  away: MatchTeam;
  fixtureId: string;
  picker?: ProofReceipt["picker"];
}

const STATES: MatchState[] = ["NOT_STARTED", "LIVE", "HT", "FT", "SUSPENDED", "POSTPONED", "VOID"];

export function buildReceipt(i: ReceiptInput): ProofReceipt {
  const home = i.homeScore ?? 0;
  const away = i.awayScore ?? 0;
  return {
    pickId: i.pickId,
    predictionLabel: i.predictionLabel,
    result: i.status,
    home: i.home,
    away: i.away,
    homeScore: home,
    awayScore: away,
    points: i.points,
    fixtureId: i.fixtureId,
    matchState: (STATES as string[]).includes(i.matchState) ? (i.matchState as MatchState) : "FT",
    marketLabel: `${i.marketId} · ${i.optionId}`,
    statKeys: `home_g=${home}, away_g=${away}`,
    payloadRef: i.proofRef ?? "—",
    // Picks are verified by TxLINE (data layer), not anchored on-chain — the
    // on-chain Market mode owns Merkle/tx anchoring. Be honest in the proof view.
    merkleStatus: i.proofRef ? "valid" : null,
    onChainStatus: null,
    settledAtMs: i.settledAtMs,
    txUrl: null,
    picker: i.picker,
  };
}
