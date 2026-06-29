import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

// Mirror an on-chain transaction into Postgres (index only — the devnet program
// is the source of truth). Node runtime; never edge. Best-effort: if the DB is
// unavailable/unmigrated we return ok:false rather than breaking the UI.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_KINDS = new Set(["FAUCET", "INIT_MARKET", "STAKE", "POST_ROOT", "SETTLE", "CLAIM", "REFUND"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { signature, wallet, matchId, marketId, kind } = body ?? {};
    if (!signature || !wallet) {
      return NextResponse.json({ ok: false, error: "missing signature/wallet" }, { status: 400 });
    }
    const txKind = VALID_KINDS.has(kind) ? kind : "STAKE";

    await prisma.wallet.upsert({
      where: { address: wallet },
      create: { address: wallet, cluster: "devnet" },
      update: {},
    });

    await prisma.transaction.upsert({
      where: { signature },
      create: {
        signature,
        walletAddress: wallet,
        kind: txKind as any,
        status: "CONFIRMED",
        metadata: { matchId, marketId },
      },
      update: { status: "CONFIRMED" },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet") ?? undefined;
    const rows = await prisma.transaction.findMany({
      where: wallet ? { walletAddress: wallet } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ ok: true, transactions: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: true, transactions: [], note: String(e?.message ?? e).slice(0, 120) });
  }
}
