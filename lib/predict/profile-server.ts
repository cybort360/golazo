import "server-only";
import { prisma } from "@/lib/db/client";
import { currentUserId } from "@/lib/predict/session";
import { getReceiptsForUser } from "@/lib/predict/receipt";
import { buildProfile } from "@/lib/predict/profile";
import { userGlobalRank } from "@/lib/predict/league";
import { colorFor } from "@/lib/predict/league-util";
import { publicName, publicInitials, profileSlug } from "@/lib/predict/identity";
import type { ProfileStats } from "@/lib/predict/types";

type UserRow = { id: string; handle: string | null; displayName: string | null; anonId: string | null };

// Build a public profile for any user from their settled picks + global rank.
async function buildFor(user: UserRow): Promise<ProfileStats> {
  const receipts = await getReceiptsForUser(user.id, 100);
  const globalRank = await userGlobalRank(user.id);
  const displayName = publicName(user);
  return buildProfile(receipts, {
    handle: profileSlug(user),
    displayName,
    initials: publicInitials(displayName),
    color: colorFor(user.id),
    tagline: "Prove you know ball.",
    globalRank,
  });
}

const SELECT = { id: true, handle: true, displayName: true, anonId: true } as const;

/** Profile of the current (cookie) user, or null if there's no session yet. */
export async function profileUi(): Promise<ProfileStats | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  return user ? buildFor(user) : null;
}

/** Public profile by handle (case-insensitive), so shared /u/<handle> links work
 *  for anyone — converted handles and ghost (ghost_…) handles alike. */
export async function profileByHandle(handle: string): Promise<ProfileStats | null> {
  const user = await prisma.user.findFirst({
    where: { handle: { equals: handle.trim(), mode: "insensitive" } },
    select: SELECT,
  });
  return user ? buildFor(user) : null;
}
