import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ensureMarketRow, type MatchInfo } from "@/lib/db/markets";

// Mirror a keeper settlement into Postgres (index only — the devnet program is
// the source of truth). Writes/updates the Settlement row and flips the Market
// to SETTLED with its winning side. Best-effort.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { matchId: string; marketId: string } },
) {
  try {
    const { matchId, marketId } = params;
    const body = await req.json();
    const {
      winningSide, // "YES" | "NO"
      claimedValue, // number
      merkleRoot, // hex string
      proof, // hex string[]
      settleTx,
      yesTotal,
      noTotal,
      question,
      lockTs, // ms epoch
      match, // { homeTeam, awayTeam, kickoff, competition }
      vaultPda,
      poolPda,
      mint,
      voided,
    } = body ?? {};

    const side = winningSide === "YES" || winningSide === "NO" ? winningSide : null;

    const market = await ensureMarketRow({
      matchId,
      marketId,
      match: match as MatchInfo | undefined,
      question,
      lockTs,
      status: voided ? "VOID" : "SETTLED",
      yesTotal: yesTotal != null ? BigInt(yesTotal) : undefined,
      noTotal: noTotal != null ? BigInt(noTotal) : undefined,
      winningSide: voided ? null : side,
      vaultPda,
      poolPda,
      mint,
    });

    await prisma.settlement.upsert({
      where: { marketId: market.id },
      create: {
        marketId: market.id,
        winningSide: voided ? null : side,
        claimedValue: Number.isFinite(claimedValue) ? Number(claimedValue) : 0,
        merkleRoot: typeof merkleRoot === "string" ? merkleRoot : "",
        proof: Array.isArray(proof) ? proof : [],
        settleTx: settleTx ?? null,
        voided: !!voided,
      },
      update: {
        winningSide: voided ? null : side,
        claimedValue: Number.isFinite(claimedValue) ? Number(claimedValue) : 0,
        merkleRoot: typeof merkleRoot === "string" ? merkleRoot : "",
        proof: Array.isArray(proof) ? proof : [],
        settleTx: settleTx ?? null,
        voided: !!voided,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) });
  }
}
