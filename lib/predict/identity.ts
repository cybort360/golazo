import { initialsFor } from "@/lib/predict/league-util";

// Shared public-identity helpers so the nav, leaderboards, and profile all show
// the SAME name for a user — and never a fabricated persona. Ghosts get a short,
// friendly "Guest-XXXX" derived from their anon id (not the raw ghost_ handle).

export interface UserIdentity {
  id: string;
  handle: string | null;
  displayName: string | null;
  anonId: string | null;
  isGhost?: boolean;
}

export function publicName(u: Pick<UserIdentity, "displayName" | "handle" | "anonId" | "id">): string {
  if (u.displayName) return u.displayName;
  if (u.handle && !u.handle.startsWith("ghost_")) return u.handle;
  const seed = (u.anonId ?? u.id ?? "").replace(/[^a-z0-9]/gi, "");
  return `Guest-${(seed.slice(0, 4) || "0000").toUpperCase()}`;
}

export function publicInitials(name: string): string {
  return initialsFor(name);
}

// URL slug for /u/<slug>. Ghosts keep their unique handle; it stays stable.
export function profileSlug(u: Pick<UserIdentity, "handle" | "anonId" | "id">): string {
  return (u.handle ?? `player-${(u.anonId ?? u.id ?? "").slice(0, 6)}`).toLowerCase();
}
