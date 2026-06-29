// Pure helpers for private leagues (testable, no server-only chain).

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

export function generateLeagueCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
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
