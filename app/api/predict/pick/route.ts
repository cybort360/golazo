import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ensureUser, currentUserId } from "@/lib/predict/session";
import { isMarketId, isPickOpen } from "@/lib/predict/pick-rules";
import type { MatchState } from "@/lib/predict/types";

// Make / change / read a free pick. Lock is enforced server-side (reject after
// lock). Ghost mode: an anonymous user is created on first pick. Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { matchId, marketId, optionId, predictionLabel } = (await req.json()) ?? {};
    if (!matchId || !isMarketId(marketId) || !optionId) {
      return NextResponse.json({ ok: false, error: "invalid pick" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { lockAt: true, status: true },
    });
    if (!match) return NextResponse.json({ ok: false, error: "unknown match" }, { status: 404 });

    if (!isPickOpen(match.lockAt?.getTime() ?? null, Date.now(), match.status as MatchState)) {
      return NextResponse.json({ ok: false, error: "picks are locked" }, { status: 409 });
    }

    const user = await ensureUser();
    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId_marketId: { userId: user.id, matchId, marketId } },
      create: {
        userId: user.id,
        matchId,
        marketId,
        optionId,
        predictionLabel: predictionLabel ?? `${marketId} · ${optionId}`,
      },
      // re-picking before lock replaces the option and resets to PENDING
      update: { optionId, predictionLabel: predictionLabel ?? `${marketId} · ${optionId}`, status: "PENDING", points: 0 },
    });

    return NextResponse.json({ ok: true, prediction });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ ok: true, picks: [] });
  const matchId = new URL(req.url).searchParams.get("matchId") ?? undefined;
  const picks = await prisma.prediction.findMany({
    where: { userId, matchId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, picks });
}
