import { describe, it, expect } from "vitest";
import {
  validateNickname,
  validateWallet,
  isCorrect,
  weekOf,
  buildLeaderboards,
  DRAW,
  type Player,
} from "@/lib/predictions";
import { gameweekForMatch } from "@/lib/fpl/gameweeks";
import type { MatchResult } from "@/hooks/useMatchResults";

describe("validateNickname", () => {
  it("accepts 3–20 alphanumerics/underscores and trims", () => {
    expect(validateNickname("  degen_99 ")).toEqual({ ok: true, value: "degen_99" });
  });
  it("rejects too short, too long, or bad characters", () => {
    expect(validateNickname("ab").ok).toBe(false);
    expect(validateNickname("a".repeat(21)).ok).toBe(false);
    expect(validateNickname("bad name!").ok).toBe(false);
    expect(validateNickname(42).ok).toBe(false);
  });
});

describe("validateWallet", () => {
  it("accepts a base58 address of plausible length", () => {
    expect(validateWallet("5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9").ok).toBe(true);
  });
  it("rejects wrong length or non-base58 (0, O, I, l)", () => {
    expect(validateWallet("abc").ok).toBe(false);
    expect(validateWallet("0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl").ok).toBe(false);
  });
});

describe("isCorrect", () => {
  const win = { winner: "BRA", loser: "MAR", isDraw: false };
  const draw = { winner: "CAN", loser: "BIH", isDraw: true };
  it("scores a correct winner pick", () => {
    expect(isCorrect("BRA", win)).toBe(true);
    expect(isCorrect("MAR", win)).toBe(false);
  });
  it("scores a correct draw pick", () => {
    expect(isCorrect(DRAW, draw)).toBe(true);
    expect(isCorrect("BRA", draw)).toBe(false);
    expect(isCorrect(DRAW, win)).toBe(false);
  });
});

describe("weekOf", () => {
  it("groups Mon–Sun into the same ISO week", () => {
    // 2026-06-08 (Mon) … 2026-06-14 (Sun) is one ISO week.
    expect(weekOf("2026-06-11")).toBe(weekOf("2026-06-14"));
    expect(weekOf("2026-06-11")).not.toBe(weekOf("2026-06-15")); // next Monday
  });
});

function result(matchId: string, winner: string, loser: string, isDraw = false): MatchResult {
  return { matchId, winner, loser, isDraw, timestamp: 0 };
}

const players: Player[] = [
  { id: "WALLET_A", nickname: "alice", wallet: "WALLET_A", createdAt: 0 },
  { id: "WALLET_B", nickname: "bob", wallet: "WALLET_B", createdAt: 0 },
];

describe("buildLeaderboards", () => {
  it("scores points only for settled matches and ranks the season board", () => {
    // GM001 MEX beat RSA, GM002 KOR beat CZE (both real group-stage fixtures).
    const results = [result("GM001", "MEX", "RSA"), result("GM002", "KOR", "CZE")];
    const picks = {
      WALLET_A: { GM001: "MEX", GM002: "KOR", GM003: "CAN" }, // 2 right, GM003 unsettled
      WALLET_B: { GM001: "RSA", GM002: "KOR" }, // 1 right
    };

    const { season } = buildLeaderboards(players, picks, results);

    expect(season[0]).toMatchObject({ nickname: "alice", points: 2, played: 2 });
    expect(season[1]).toMatchObject({ nickname: "bob", points: 1, played: 2 });
  });

  it("buckets points into the match's gameweek (matchday)", () => {
    const results = [result("GM001", "MEX", "RSA")]; // opener → GW1
    const picks = { WALLET_A: { GM001: "MEX" } };
    const { weeks } = buildLeaderboards(players, picks, results);
    const gw = gameweekForMatch("GM001")!.id;
    expect(gw).toBe("GW1");
    expect(weeks[gw][0]).toMatchObject({ nickname: "alice", points: 1 });
  });

  it("gives a player with no settled picks zero points but still lists them", () => {
    const { season } = buildLeaderboards(players, {}, []);
    expect(season.every((r) => r.points === 0 && r.played === 0)).toBe(true);
    expect(season).toHaveLength(2);
  });
});
