import "server-only";
import { prisma } from "@/lib/db/client";
import { ensureUser } from "@/lib/predict/session";
import { syncAll } from "@/lib/predict/ingest";
import { settleFinished, type SettleCounts } from "@/lib/predict/settle";

// Demo seed (P4-16): make the social loop visible on REAL TxLINE fixtures.
// Ingests live fixtures, gives the current user + two rivals picks across the
// soonest real matches, puts them in a shared league, and runs the REAL resolver.
// Outcomes settle as matches actually finish — nothing is faked. Idempotent.

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

export async function seedDemo(): Promise<{ leagueCode: string; settled: SettleCounts; userId: string; picks: number }> {
  await syncAll();
  const you = await ensureUser();
  const mikey = await upsertNamed("mikey", "Mikey");
  const sara = await upsertNamed("sara", "Sara");

  // Real fixtures, soonest first (so in-progress/finishing matches settle first).
  const matches = await prisma.match.findMany({
    orderBy: { lockAt: "asc" },
    take: 4,
    select: { id: true, homeTeam: true, awayTeam: true },
  });

  // Spread varied markets across the three players on real matches. Winner uses
  // the "home"/"away" aliases the resolver understands regardless of ticker.
  // (Chaos is skipped: goal minutes aren't in the snapshot feed yet → would VOID.)
  const picks: [string, string, string, string, string][] = [];
  matches.forEach((m, i) => {
    const HOME = `${m.homeTeam} to win`;
    const AWAY = `${m.awayTeam} to win`;
    if (i === 0) {
      picks.push([you.id, m.id, "winner", "home", HOME]);
      picks.push([sara, m.id, "winner", "away", AWAY]);
      picks.push([mikey, m.id, "btts", "yes", "Both teams to score"]);
    } else if (i === 1) {
      picks.push([you.id, m.id, "totals", "over", "Over 2.5 goals"]);
      picks.push([mikey, m.id, "winner", "home", HOME]);
    } else if (i === 2) {
      picks.push([sara, m.id, "btts", "no", "Not both to score"]);
      picks.push([you.id, m.id, "winner", "away", AWAY]);
    } else {
      picks.push([mikey, m.id, "totals", "under", "Under 2.5 goals"]);
      picks.push([sara, m.id, "winner", "home", HOME]);
    }
  });
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
  return { leagueCode: DEMO_LEAGUE_CODE, settled, userId: you.id, picks: picks.length };
}
