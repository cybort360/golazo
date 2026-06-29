import "server-only";
import { prisma } from "@/lib/db/client";
import { currentUserId } from "@/lib/predict/session";
import { getUserReceipts } from "@/lib/predict/receipt";
import { buildProfile } from "@/lib/predict/profile";
import { globalLeaderboardUi } from "@/lib/predict/league";
import { colorFor } from "@/lib/predict/league-util";
import { publicName, publicInitials, profileSlug } from "@/lib/predict/identity";
import type { ProfileStats } from "@/lib/predict/types";

// Real public profile for the current user, derived from their settled picks.
// Returns null when there's no user yet (caller falls back to the demo profile).
export async function profileUi(): Promise<ProfileStats | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { handle: true, displayName: true, anonId: true },
  });
  if (!user) return null;

  const receipts = await getUserReceipts(100);
  const board = await globalLeaderboardUi();
  const globalRank = board?.you.isYou ? board.you.rank : null;

  const displayName = publicName({ ...user, id: userId });

  return buildProfile(receipts, {
    handle: profileSlug({ ...user, id: userId }),
    displayName,
    initials: publicInitials(displayName),
    color: colorFor(userId),
    tagline: "Prove you know ball.",
    globalRank,
  });
}
