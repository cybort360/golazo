import "server-only";
import { prisma } from "@/lib/db/client";
import { currentUserId } from "@/lib/predict/session";
import { buildReceipt } from "@/lib/predict/receipt-build";
import type { ProofReceipt, MatchTeam } from "@/lib/predict/types";

// Build ProofReceipts for the current user from settled Predictions + their
// match. The Prediction row is the settlement record (status/points/proofRef).

type MatchRow = {
  id: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: string;
  awayTeam: string;
  homeTicker: string | null;
  awayTicker: string | null;
  homeFlag: string | null;
  awayFlag: string | null;
  homeColor: string | null;
  awayColor: string | null;
};

function team(name: string, ticker: string | null, flag: string | null, color: string | null): MatchTeam {
  return {
    ticker: ticker ?? name.slice(0, 3).toUpperCase(),
    name,
    flagCode: flag ?? "",
    color: color ?? "#334155",
  };
}

function toReceipt(p: {
  id: string;
  predictionLabel: string;
  marketId: string;
  optionId: string;
  status: ProofReceipt["result"];
  points: number;
  proofRef: string | null;
  settledAt: Date | null;
  match: MatchRow;
}): ProofReceipt {
  return buildReceipt({
    pickId: p.id,
    predictionLabel: p.predictionLabel,
    marketId: p.marketId,
    optionId: p.optionId,
    status: p.status,
    points: p.points,
    proofRef: p.proofRef,
    settledAtMs: p.settledAt?.getTime() ?? Date.now(),
    matchState: p.match.status,
    homeScore: p.match.homeScore,
    awayScore: p.match.awayScore,
    home: team(p.match.homeTeam, p.match.homeTicker, p.match.homeFlag, p.match.homeColor),
    away: team(p.match.awayTeam, p.match.awayTicker, p.match.awayFlag, p.match.awayColor),
    fixtureId: p.match.id,
  });
}

export async function getUserReceipts(limit = 10): Promise<ProofReceipt[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const preds = await prisma.prediction.findMany({
    where: { userId, status: { in: ["WON", "LOST", "VOID"] } },
    orderBy: { settledAt: "desc" },
    take: limit,
    include: { match: true },
  });
  return preds.map((p) => toReceipt(p as any));
}

export async function getUserReceipt(pickId: string): Promise<ProofReceipt | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const p = await prisma.prediction.findFirst({
    where: { id: pickId, userId },
    include: { match: true },
  });
  return p ? toReceipt(p as any) : null;
}

/**
 * Public receipt lookup by id (no user scope). A receipt is a shareable proof —
 * the deep link must render for anyone, including not-logged-in recipients in
 * Telegram/Discord (P2-13). Only settled picks have a meaningful receipt.
 */
export async function getReceiptById(pickId: string): Promise<ProofReceipt | null> {
  const p = await prisma.prediction.findFirst({
    where: { id: pickId, status: { in: ["WON", "LOST", "VOID"] } },
    include: { match: true },
  });
  return p ? toReceipt(p as any) : null;
}
