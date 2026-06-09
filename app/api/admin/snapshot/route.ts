import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getTokenHolders } from "@/lib/helius";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let mintAddress: unknown;
  try {
    ({ mintAddress } = (await request.json()) as { mintAddress?: unknown });
  } catch {
    mintAddress = undefined;
  }

  if (typeof mintAddress !== "string" || mintAddress.length === 0) {
    return NextResponse.json(
      { ok: false, error: "mintAddress required" },
      { status: 400 },
    );
  }

  try {
    const holders = await getTokenHolders(mintAddress);
    return NextResponse.json({ ok: true, holders });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Snapshot failed" },
      { status: 500 },
    );
  }
}
