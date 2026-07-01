import "server-only";
import { prisma } from "@/lib/db/client";
import { currentUserId } from "@/lib/predict/session";
import { groupActivePicks, type ActivePickRow } from "@/lib/predict/picks-build";
import type { ActivePickGroup } from "@/lib/predict/types";

// The current user's active (not-yet-settled) picks, grouped by match. Settled
// picks live in Receipts; these are the PENDING ones awaiting a verified final.
export async function getUserActivePicks(): Promise<ActivePickGroup[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await prisma.prediction.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { match: true },
  });
  return groupActivePicks(rows as unknown as ActivePickRow[]);
}
