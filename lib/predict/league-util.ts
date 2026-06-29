// Pure helpers for private leagues (testable, no server-only chain).
import { randomInt } from "node:crypto";
import type { LeagueMember } from "@/lib/predict/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
const CODE_LEN = 8;

// Invite codes are access tokens, so default to a CSPRNG. `rand` stays injectable
// (returns 0..1) for deterministic tests.
function cryptoRand(): number {
  return randomInt(0, 1 << 30) / (1 << 30);
}

export function generateLeagueCode(rand: () => number = cryptoRand): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    const idx = Math.min(CODE_ALPHABET.length - 1, Math.floor(rand() * CODE_ALPHABET.length));
    s += CODE_ALPHABET[idx];
  }
  return `GLZ-${s}`;
}

const PALETTE = ["#dc2626", "#2563eb", "#0f766e", "#7c3aed", "#16a34a", "#ea580c", "#f59e0b", "#0ea5e9"];

export function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export interface MemberStat {
  userId: string;
  name: string;
  points: number;
  won: number;
  settled: number;
  streak?: number; // current consecutive-WON streak
  isYou?: boolean;
}

export interface RankedMember extends MemberStat {
  rank: number;
  accuracy: number; // 0..1
  initials: string;
  color: string;
}

/** Rank members by points (desc), then name; compute accuracy + avatar bits. */
export function rankStandings(members: MemberStat[]): RankedMember[] {
  return [...members]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((m, i) => ({
      ...m,
      rank: i + 1,
      accuracy: m.settled > 0 ? m.won / m.settled : 0,
      initials: initialsFor(m.name),
      color: colorFor(m.userId),
    }));
}

/** Map a ranked standings row to the UI's LeagueMember shape. */
export function rankedToMember(m: RankedMember): LeagueMember {
  return {
    rank: m.rank,
    userId: m.userId,
    name: m.name,
    initials: m.initials,
    color: m.color,
    points: m.points,
    accuracy: m.accuracy,
    streak: m.streak ?? 0,
    isYou: m.isYou ?? false,
  };
}
