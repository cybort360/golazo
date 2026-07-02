import "server-only";
import { prisma } from "@/lib/db/client";
import { getTxlineClient } from "@/lib/txline";
import type { TxlineClient, TxlineFinalResult } from "@/lib/txline/client";
import { decidePrediction } from "@/lib/predict/settle-decide";
import { goalLogFromEvents } from "@/lib/predict/resolve";
import type { MarketId } from "@/lib/predict/types";

/**
 * The verified goal-minute log lives in the append-only event log (the SSE feed
 * records each goal as it happens — the snapshot can't). Enrich the TxLINE final
 * with it so the Chaos market (goal after 80') resolves on real data. If the log
 * is incomplete (fewer goals captured than the final score — e.g. SSE never ran
 * for this fixture), mark `late_goal` unavailable so Chaos VOIDs honestly rather
 * than guessing.
 */
async function enrichGoalLog(fixtureId: string, final: TxlineFinalResult): Promise<TxlineFinalResult> {
  const events = await prisma.txlineEvent.findMany({
    where: { matchId: fixtureId },
    orderBy: { seq: "asc" },
    select: { type: true, minute: true, homeScore: true, awayScore: true },
  });
  const fromLog = goalLogFromEvents(events);
  const totalGoals = (final.homeScore ?? 0) + (final.awayScore ?? 0);

  if (fromLog.length >= totalGoals) {
    // Captured every goal (a 0-0 trivially qualifies) → authoritative minute log.
    return { ...final, goals: fromLog, available: { ...final.available, late_goal: true } };
  }
  if (final.goals.length >= totalGoals && final.goals.length > 0) {
    // Client supplied a complete log (e.g. the mock) → trust it.
    return { ...final, available: { ...final.available, late_goal: true } };
  }
  // Neither source has the full goal log → can't resolve Chaos.
  return { ...final, available: { ...final.available, late_goal: false } };
}

// Deterministic auto-settlement (PRD §6.3). Runs each open prediction's resolver
// against the verified TxLINE final, writes status/points/proof onto the
// Prediction (its own settlement record), and is idempotent + replayable: only
// PENDING picks are touched, so re-running yields the same result.

export interface SettleCounts {
  settled: number;
  won: number;
  lost: number;
  void: number;
}

const ZERO: SettleCounts = { settled: 0, won: 0, lost: 0, void: 0 };

export async function settleMatch(
  fixtureId: string,
  client: TxlineClient = getTxlineClient(),
): Promise<SettleCounts> {
  const raw = await client.finalResult(fixtureId);
  if (!raw) return { ...ZERO }; // not settle-eligible yet
  const final = await enrichGoalLog(fixtureId, raw);

  const match = await prisma.match.findUnique({
    where: { id: fixtureId },
    select: { homeTicker: true, awayTicker: true },
  });
  const preds = await prisma.prediction.findMany({
    where: { matchId: fixtureId, status: "PENDING" },
  });

  const counts: SettleCounts = { ...ZERO };
  for (const p of preds) {
    const d = decidePrediction(final, p.marketId as MarketId, p.optionId, {
      home: match?.homeTicker ?? undefined,
      away: match?.awayTicker ?? undefined,
    });
    if (!d) continue;
    await prisma.prediction.update({
      where: { id: p.id },
      data: { status: d.status, points: d.points, proofRef: d.proofRef, settledAt: new Date() },
    });
    counts.settled++;
    if (d.status === "WON") counts.won++;
    else if (d.status === "LOST") counts.lost++;
    else counts.void++;
  }
  return counts;
}

/**
 * Settle every match that still has PENDING predictions.
 *
 * Keyed off the DB (matches with open picks), NOT the live fixtures snapshot:
 * TxLINE drops finished matches from `fixtures()` once they're done, so iterating
 * that list silently skips exactly the matches we need to settle. `settleMatch`
 * fetches the per-fixture final (which stays available after a match leaves the
 * list) and leaves not-yet-final matches PENDING, so this stays idempotent.
 */
export async function settleFinished(
  client: TxlineClient = getTxlineClient(),
): Promise<SettleCounts> {
  const open = await prisma.prediction.findMany({
    where: { status: "PENDING" },
    select: { matchId: true },
    distinct: ["matchId"],
  });
  const totals: SettleCounts = { ...ZERO };
  for (const { matchId } of open) {
    const r = await settleMatch(matchId, client);
    totals.settled += r.settled;
    totals.won += r.won;
    totals.lost += r.lost;
    totals.void += r.void;
  }
  return totals;
}
