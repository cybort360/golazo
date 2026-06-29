import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

// Read the indexed view of a market for the proof-receipt page: market state,
// settlement, per-wallet receipts and the mirrored on-chain transactions.
// BigInt columns are stringified for JSON. Best-effort: returns empty shapes if
// the DB is unavailable/unmigrated so the UI degrades gracefully.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { matchId: string; marketId: string } },
) {
  const { matchId, marketId } = params;
  try {
    const market = await prisma.market.findUnique({
      where: { matchId_marketId: { matchId, marketId } },
      include: { settlement: true, proofReceipts: { orderBy: { createdAt: "desc" } } },
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        AND: [
          { metadata: { path: ["matchId"], equals: matchId } },
          { metadata: { path: ["marketId"], equals: marketId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      market: market
        ? {
            matchId: market.matchId,
            marketId: market.marketId,
            question: market.question,
            status: market.status,
            winningSide: market.winningSide,
            yesTotal: market.yesTotal.toString(),
            noTotal: market.noTotal.toString(),
            vaultPda: market.vaultPda,
            poolPda: market.poolPda,
            mint: market.mint,
            settlement: market.settlement
              ? {
                  winningSide: market.settlement.winningSide,
                  claimedValue: market.settlement.claimedValue,
                  merkleRoot: market.settlement.merkleRoot,
                  settleTx: market.settlement.settleTx,
                  voided: market.settlement.voided,
                  settledAt: market.settlement.settledAt,
                }
              : null,
            receipts: market.proofReceipts.map((r) => ({
              walletAddress: r.walletAddress,
              prediction: r.prediction,
              result: r.result,
              verified: r.verified,
              claimTx: r.claimTx,
            })),
          }
        : null,
      transactions: transactions.map((t) => ({
        signature: t.signature,
        kind: t.kind,
        walletAddress: t.walletAddress,
        createdAt: t.createdAt,
        metadata: t.metadata,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: true,
      market: null,
      transactions: [],
      note: String(e?.message ?? e).slice(0, 120),
    });
  }
}
