import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/predict/demo";

// Seed the demo loop for the current user (P4-16). Allowed outside production;
// in production require the admin secret so it can't be triggered publicly.
import { isAdminAuthorized } from "@/lib/api/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: Request) {
  if (process.env.NODE_ENV === "production" && !isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const res = await seedDemo();
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
