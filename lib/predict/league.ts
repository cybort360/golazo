import "server-only";
import { prisma } from "@/lib/db/client";
import { ensureUser, currentUserId } from "@/lib/predict/session";
import { generateLeagueCode, rankStandings, type MemberStat, type RankedMember } from "@/lib/predict/league-util";

// Private leagues (PRD §6.3): create / join via code + a private leaderboard
// ranked by points earned from settled picks.

export interface LeagueView {
  code: string;
  name: string;
  memberCount: number;
  yourRank: number | null;
  members: RankedMember[];
}

export async function createLeague(name: string): Promise<{ code: string }> {
  const user = await ensureUser();
  // retry a few times in the unlikely event of a code collision
  for (let i = 0; i < 5; i++) {
    const code = generateLeagueCode();
    const existing = await prisma.privateLeague.findUnique({ where: { code }, select: { id: true } });
    if (existing) continue;
    const league = await prisma.privateLeague.create({
      data: { name: name.trim() || "My League", code, ownerUserId: user.id },
    });
    await prisma.leagueMember.create({ data: { leagueId: league.id, userId: user.id } });
    return { code };
  }
  throw new Error("could not allocate a league code");
}

export async function joinLeague(code: string): Promise<{ code: string }> {
  const user = await ensureUser();
  const league = await prisma.privateLeague.findUnique({ where: { code }, select: { id: true, code: true } });
  if (!league) throw new Error("league not found");
  await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
    create: { leagueId: league.id, userId: user.id },
    update: {},
  });
  return { code: league.code };
}

/** Member stats (points/accuracy) for a set of users, from settled predictions. */
async function memberStats(userIds: string[], you: string | null): Promise<MemberStat[]> {
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, handle: true, displayName: true },
  });
  const preds = await prisma.prediction.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, status: true, points: true },
  });
  const agg = new Map<string, { points: number; won: number; settled: number }>();
  for (const id of userIds) agg.set(id, { points: 0, won: 0, settled: 0 });
  for (const p of preds) {
    const a = agg.get(p.userId)!;
    a.points += p.points;
    if (p.status === "WON" || p.status === "LOST") a.settled++;
    if (p.status === "WON") a.won++;
  }
  return users.map((u) => {
    const a = agg.get(u.id)!;
    return {
      userId: u.id,
      name: u.displayName ?? u.handle,
      points: a.points,
      won: a.won,
      settled: a.settled,
      isYou: u.id === you,
    };
  });
}

export async function leagueStandings(code: string): Promise<LeagueView | null> {
  const you = await currentUserId();
  const league = await prisma.privateLeague.findUnique({
    where: { code },
    include: { members: { select: { userId: true } } },
  });
  if (!league) return null;
  const stats = await memberStats(league.members.map((m) => m.userId), you);
  const members = rankStandings(stats);
  const yourRank = members.find((m) => m.isYou)?.rank ?? null;
  return { code: league.code, name: league.name, memberCount: members.length, yourRank, members };
}

export async function myLeagues(): Promise<{ code: string; name: string; memberCount: number }[]> {
  const you = await currentUserId();
  if (!you) return [];
  const leagues = await prisma.privateLeague.findMany({
    where: { members: { some: { userId: you } } },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });
  return leagues.map((l) => ({ code: l.code, name: l.name, memberCount: l._count.members }));
}
