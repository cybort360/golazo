import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ensureMarketRow } from "@/lib/db/markets";

// Mirror a claim/refund into Postgres as a per-wallet ProofReceipt (index only —
// the devnet program is the source of truth). Idempotent per (market, wallet).
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
      wallet,
      prediction, // "YES" | "NO"
      result, // resolved label or "VOID"
      verified,
      escrowAddress,
      settlementTx,
      claimTx,
    } = body ?? {};

    if (!wallet || (prediction !== "YES" && prediction !== "NO")) {
      return NextResponse.json({ ok: false, error: "missing wallet/prediction" }, { status: 400 });
    }

    const market = await ensureMarketRow({ matchId, marketId });

    await prisma.wallet.upsert({
      where: { address: wallet },
      create: { address: wallet, cluster: "devnet" },
      update: {},
    });

    await prisma.proofReceipt.upsert({
      where: { marketId_walletAddress: { marketId: market.id, walletAddress: wallet } },
      create: {
        marketId: market.id,
        walletAddress: wallet,
        prediction,
        result: result ?? null,
        verified: !!verified,
        escrowAddress: escrowAddress ?? null,
        settlementTx: settlementTx ?? null,
        claimTx: claimTx ?? null,
      },
      update: {
        result: result ?? undefined,
        verified: verified != null ? !!verified : undefined,
        escrowAddress: escrowAddress ?? undefined,
        settlementTx: settlementTx ?? undefined,
        claimTx: claimTx ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) });
  }
}
