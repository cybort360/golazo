import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

// Lightweight authenticated ops/status endpoint. Read-only. Auth: Bearer token
// matching ADMIN_TOKEN (preferred) or CRON_SECRET (already set in prod, so this
// works without new config). Surfaces the health signals that matter after the
// settlement fix — chiefly `settlementBacklog`: PENDING picks on matches that
// have already finished. That number should be 0 when settlement is healthy.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_TOKEN ?? process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured → never an open endpoint
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function tally(rows: { status: string; _count: number }[]): Record<string, number> {
  return Object.fromEntries(rows.map((r) => [r.status, r._count]));
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [
    matchesByStatus,
    predsByStatus,
    matchTotal,
    predTotal,
    userTotal,
    ghosts,
    settlementBacklog,
    pointsAgg,
    recentSettled,
  ] = await Promise.all([
    prisma.match.groupBy({ by: ["status"], _count: true }),
    prisma.prediction.groupBy({ by: ["status"], _count: true }),
    prisma.match.count(),
    prisma.prediction.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isGhost: true } }),
    // PENDING picks on matches that have already finished → settlement lag.
    prisma.prediction.count({ where: { status: "PENDING", match: { status: { in: ["FT", "VOID"] } } } }),
    prisma.prediction.aggregate({ _sum: { points: true } }),
    prisma.prediction.findMany({
      where: { status: { in: ["WON", "LOST", "VOID"] } },
      orderBy: { settledAt: "desc" },
      take: 10,
      select: {
        marketId: true,
        optionId: true,
        status: true,
        points: true,
        settledAt: true,
        match: { select: { homeTeam: true, awayTeam: true, homeScore: true, awayScore: true } },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    matches: { total: matchTotal, byStatus: tally(matchesByStatus as { status: string; _count: number }[]) },
    predictions: {
      total: predTotal,
      byStatus: tally(predsByStatus as { status: string; _count: number }[]),
      pointsAwarded: pointsAgg._sum.points ?? 0,
    },
    users: { total: userTotal, ghosts, converted: userTotal - ghosts },
    settlementBacklog, // 0 == healthy: no finished match has unsettled picks
    recentSettled: recentSettled.map((p) => ({
      match: `${p.match.homeTeam} ${p.match.homeScore ?? "-"}-${p.match.awayScore ?? "-"} ${p.match.awayTeam}`,
      pick: `${p.marketId}/${p.optionId}`,
      status: p.status,
      points: p.points,
      settledAt: p.settledAt,
    })),
  });
}
