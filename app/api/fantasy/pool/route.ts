import { NextResponse } from "next/server";
import { getPool } from "@/lib/fpl/store";

export const dynamic = "force-dynamic";

// Public: the priced player pool for the squad builder. Empty until an admin
// runs the sync (which needs the Deep Data tier).
export async function GET() {
  const pool = await getPool();
  return NextResponse.json({ players: pool });
}
