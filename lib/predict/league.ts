import "server-only";
import { prisma } from "@/lib/db/client";
import { ensureUser, currentUserId } from "@/lib/predict/session";
import { generateLeagueCode, rankStandings, rankedToMember, type MemberStat, type RankedMember } from "@/lib/predict/league-util";
import { computeDelta } from "@/lib/predict/leaderboard-delta";
import type { League, GlobalLeaderboard, LeagueMember } from "@/lib/predict/types";
import { publicName } from "@/lib/predict/identity";

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

/** Member stats (points/accuracy/streak) for a set of users, from settled predictions. */
async function memberStats(userIds: string[], you: string | null): Promise<MemberStat[]> {
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, handle: true, displayName: true, anonId: true },
  });
  const preds = await prisma.prediction.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, status: true, points: true, settledAt: true },
    orderBy: { settledAt: "desc" },
  });
  const agg = new Map<string, { points: number; won: number; settled: number; streak: number; streakOpen: boolean }>();
  for (const id of userIds) agg.set(id, { points: 0, won: 0, settled: 0, streak: 0, streakOpen: true });
  // preds are settledAt desc, so the first settled rows per user form the streak.
  for (const p of preds) {
    const a = agg.get(p.userId)!;
    a.points += p.points;
    if (p.status === "WON" || p.status === "LOST") {
      a.settled++;
      if (a.streakOpen && p.status === "WON") a.streak++;
      else if (p.status === "LOST") a.streakOpen = false;
    }
  }
  // count wins separately (streak loop above only tracks leading WONs)
  const wins = new Map<string, number>();
  for (const id of userIds) wins.set(id, 0);
  for (const p of preds) if (p.status === "WON") wins.set(p.userId, (wins.get(p.userId) ?? 0) + 1);

  return users.map((u) => {
    const a = agg.get(u.id)!;
    return {
      userId: u.id,
      handle: u.handle ?? undefined,
      name: publicName(u),
      points: a.points,
      won: wins.get(u.id) ?? 0,
      settled: a.settled,
      streak: a.streak,
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

export interface LeagueMovement {
  code: string;
  name: string;
  rank: number;
  previousRank: number;
  memberCount: number;
  pointsGained: number;
}

/**
 * The leaderboard-update moment (PRD §4 step 8): for a just-settled pick, how it
 * moved the current user in each of their private leagues. Returns [] if the pick
 * isn't theirs or they're in no leagues. Movements are ordered biggest-rise-first
 * so the UI can lead with the most exciting one.
 */
export async function pickLeagueMovement(pickId: string): Promise<LeagueMovement[]> {
  const you = await currentUserId();
  if (!you) return [];
  const pred = await prisma.prediction.findFirst({
    where: { id: pickId, userId: you },
    select: { points: true },
  });
  if (!pred) return [];

  const leagues = await prisma.privateLeague.findMany({
    where: { members: { some: { userId: you } } },
    include: { members: { select: { userId: true } } },
  });

  const out: LeagueMovement[] = [];
  for (const lg of leagues) {
    const stats = await memberStats(lg.members.map((m) => m.userId), you);
    const d = computeDelta(rankStandings(stats), you, pred.points);
    if (!d) continue;
    out.push({ code: lg.code, name: lg.name, pointsGained: pred.points, ...d });
  }
  // biggest jump first, then current rank
  out.sort((a, b) => b.previousRank - b.rank - (a.previousRank - a.rank) || a.rank - b.rank);
  return out;
}

/** A specific user's rank on the global (all-users) board, or null if unknown. */
export async function userGlobalRank(userId: string): Promise<number | null> {
  const ids = (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id);
  if (ids.length === 0) return null;
  const ranked = rankStandings(await memberStats(ids, null));
  return ranked.find((m) => m.userId === userId)?.rank ?? null;
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

// ---- UI-shaped views (real DB data for the Picks screens) -------------------

function viewToUi(v: LeagueView): League {
  return {
    code: v.code,
    name: v.name,
    yourRank: v.yourRank ?? 0,
    memberCount: v.memberCount,
    members: v.members.map(rankedToMember),
  };
}

/** Full UI leagues for the current user (list + detail), real standings. */
export async function myLeaguesUi(): Promise<League[]> {
  const summaries = await myLeagues();
  const views = await Promise.all(summaries.map((s) => leagueStandings(s.code)));
  return views.filter((v): v is LeagueView => v !== null).map(viewToUi);
}

/** One league's UI standings by code. */
export async function leagueUi(code: string): Promise<League | null> {
  const v = await leagueStandings(code.toUpperCase());
  return v ? viewToUi(v) : null;
}

/** Public, all-users global leaderboard ranked by total points. */
export async function globalLeaderboardUi(topN = 20): Promise<GlobalLeaderboard | null> {
  const you = await currentUserId();
  const ids = (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id);
  if (ids.length === 0) return null;
  const ranked = rankStandings(await memberStats(ids, you));
  const top = ranked.slice(0, topN).map(rankedToMember);
  const youRow = ranked.find((m) => m.isYou);
  const you2: LeagueMember = youRow
    ? rankedToMember(youRow)
    : { rank: ranked.length + 1, userId: you ?? "anon", name: "You", initials: "YOU", color: "#1e293b", points: 0, accuracy: 0, streak: 0, isYou: true };
  return { totalPlayers: ranked.length, you: you2, top };
}
