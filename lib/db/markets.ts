import "server-only";
import { prisma } from "@/lib/db/client";
import type { MarketStatus, Side } from "@prisma/client";

// Minimal match metadata needed to satisfy the non-null Match columns the first
// time we index a market. Subsequent upserts leave the Match untouched.
export interface MatchInfo {
  homeTeam?: string;
  awayTeam?: string;
  competition?: string;
  kickoff?: string | Date;
}

export interface EnsureMarketInput {
  matchId: string;
  marketId: string;
  match?: MatchInfo;
  question?: string;
  statKey?: string;
  lockTs?: string | Date | number;
  status?: MarketStatus;
  yesTotal?: bigint;
  noTotal?: bigint;
  winningSide?: Side | null;
  poolPda?: string;
  vaultPda?: string;
  mint?: string;
}

function toDate(v: string | Date | number | undefined, fallback: Date): Date {
  if (v == null) return fallback;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

/**
 * Ensure the Match + Market index rows exist (the FK targets for Settlement,
 * ProofReceipt and Transaction) and apply any known on-chain state. Returns the
 * Market row (its cuid `id` is what the related tables reference). Best-effort:
 * the devnet program remains the source of truth.
 */
export async function ensureMarketRow(input: EnsureMarketInput) {
  const now = new Date();
  const lockTs = toDate(input.lockTs, now);

  await prisma.match.upsert({
    where: { id: input.matchId },
    create: {
      id: input.matchId,
      homeTeam: input.match?.homeTeam ?? "Home",
      awayTeam: input.match?.awayTeam ?? "Away",
      competition: input.match?.competition,
      kickoff: toDate(input.match?.kickoff, lockTs),
    },
    update: {},
  });

  const updateData: Record<string, unknown> = {};
  if (input.question != null) updateData.question = input.question;
  if (input.status != null) updateData.status = input.status;
  if (input.yesTotal != null) updateData.yesTotal = input.yesTotal;
  if (input.noTotal != null) updateData.noTotal = input.noTotal;
  if (input.winningSide !== undefined) updateData.winningSide = input.winningSide;
  if (input.poolPda != null) updateData.poolPda = input.poolPda;
  if (input.vaultPda != null) updateData.vaultPda = input.vaultPda;
  if (input.mint != null) updateData.mint = input.mint;

  return prisma.market.upsert({
    where: { matchId_marketId: { matchId: input.matchId, marketId: input.marketId } },
    create: {
      matchId: input.matchId,
      marketId: input.marketId,
      statKey: input.statKey ?? input.marketId,
      question: input.question ?? input.marketId,
      status: input.status ?? "OPEN",
      lockTs,
      yesTotal: input.yesTotal ?? 0n,
      noTotal: input.noTotal ?? 0n,
      winningSide: input.winningSide ?? null,
      poolPda: input.poolPda,
      vaultPda: input.vaultPda,
      mint: input.mint,
    },
    update: updateData,
  });
}
