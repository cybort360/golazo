import "server-only";
import { prisma } from "@/lib/db/client";
import { ensureUser } from "@/lib/predict/session";
import { syncAll } from "@/lib/predict/ingest";
import { settleFinished, type SettleCounts } from "@/lib/predict/settle";

// Demo seed (P4-16): make the verified loop visible without waiting for live
// fixtures. Ingests TxLINE, gives the current user + two rivals picks on finished
// World Cup fixtures, puts them in a shared league, and runs the REAL resolver so
// receipts/profile/leaderboard show genuine settled results. Idempotent.

const DEMO_LEAGUE_CODE = "GLZ-WORLDCUP";

async function upsertNamed(handle: string, displayName: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (existing) return existing.id;
  const u = await prisma.user.create({ data: { handle, displayName, isGhost: false } });
  return u.id;
}

async function pick(userId: string, matchId: string, marketId: string, optionId: string, label: string) {
  await prisma.prediction.upsert({
    where: { userId_matchId_marketId: { userId, matchId, marketId } },
    create: { userId, matchId, marketId, optionId, predictionLabel: label },
    update: { optionId, predictionLabel: label, status: "PENDING", points: 0 },
  });
}

export async function seedDemo(): Promise<{ leagueCode: string; settled: SettleCounts; userId: string }> {
  await syncAll();
  const you = await ensureUser();
  const mikey = await upsertNamed("mikey", "Mikey");
  const sara = await upsertNamed("sara", "Sara");

  // Picks on finished fixtures (bypass lock — this is a demo seed). The resolver
  // decides outcomes; we don't hardcode WON/LOST.
  const picks: [string, string, string, string, string][] = [
    [you.id, "WC-A-BRA-ARG", "winner", "BRA", "Brazil to win"],
    [you.id, "WC-A-BRA-ARG", "chaos", "yes", "Goal after 80'"],
    [you.id, "WC-D-GER-NED", "btts", "no", "Not both to score"],
    [mikey, "WC-A-BRA-ARG", "winner", "ARG", "Argentina to win"],
    [mikey, "WC-D-GER-NED", "totals", "over", "Over 2.5 goals"],
    [mikey, "WC-A-FRA-ESP", "btts", "yes", "Both teams to score"],
    [sara, "WC-A-BRA-ARG", "chaos", "yes", "Goal after 80'"],
    [sara, "WC-A-FRA-ESP", "winner", "draw", "Draw"],
    [sara, "WC-D-GER-NED", "totals", "over", "Over 2.5 goals"],
  ];
  for (const [uid, mid, mk, opt, label] of picks) await pick(uid, mid, mk, opt, label);

  // Shared league with all three.
  const league = await prisma.privateLeague.upsert({
    where: { code: DEMO_LEAGUE_CODE },
    create: { code: DEMO_LEAGUE_CODE, name: "World Cup Crew", ownerUserId: you.id },
    update: {},
  });
  for (const uid of [you.id, mikey, sara]) {
    await prisma.leagueMember.upsert({
      where: { leagueId_userId: { leagueId: league.id, userId: uid } },
      create: { leagueId: league.id, userId: uid },
      update: {},
    });
  }

  const settled = await settleFinished();
  return { leagueCode: DEMO_LEAGUE_CODE, settled, userId: you.id };
}
