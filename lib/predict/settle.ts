import "server-only";
import { prisma } from "@/lib/db/client";
import { getTxlineClient } from "@/lib/txline";
import type { TxlineClient } from "@/lib/txline/client";
import { decidePrediction } from "@/lib/predict/settle-decide";
import type { MarketId } from "@/lib/predict/types";

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
  const final = await client.finalResult(fixtureId);
  if (!final) return { ...ZERO }; // not settle-eligible yet

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

/** Settle every fixture that has reached a final state. */
export async function settleFinished(
  client: TxlineClient = getTxlineClient(),
): Promise<SettleCounts> {
  const fixtures = await client.fixtures();
  const totals: SettleCounts = { ...ZERO };
  for (const f of fixtures) {
    const r = await settleMatch(f.id, client);
    totals.settled += r.settled;
    totals.won += r.won;
    totals.lost += r.lost;
    totals.void += r.void;
  }
  return totals;
}
