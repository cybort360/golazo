import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getNextUnplayedMatch,
  getTodaysMatches,
  getMatchStatus,
  getTeamRecord,
  type MatchResult,
} from "@/lib/schedule";
import { SCHEDULE } from "@/constants/schedule";

// GM001 = MEX v RSA, 2026-06-11 15:00 ET = 19:00 UTC.
const GM001_KICKOFF_UTC = Date.UTC(2026, 5, 11, 19, 0, 0);
const gm001 = SCHEDULE.find((m) => m.id === "GM001")!;

function result(matchId: string, isDraw = false): MatchResult {
  return { matchId, winner: "MEX", loser: "RSA", isDraw };
}

describe("getNextUnplayedMatch", () => {
  it("returns the earliest fixture when nothing is played", () => {
    expect(getNextUnplayedMatch([])?.id).toBe("GM001");
  });

  it("advances past fixtures that have a recorded result", () => {
    expect(getNextUnplayedMatch([result("GM001")])?.id).toBe("GM002");
  });

  it("skips matches whose live window has elapsed when now is provided", () => {
    // Midday June 13: the June 11-12 fixtures are long over even with no result
    // recorded, so the banner should land on the first June 13 match (GM005),
    // not stick on the opener.
    const now = Date.UTC(2026, 5, 13, 12, 0, 0);
    expect(getNextUnplayedMatch([], now)?.id).toBe("GM005");
  });

  it("keeps an in-progress match featured even without a result", () => {
    const now = GM001_KICKOFF_UTC + 30 * 60 * 1000; // 30 min into GM001
    expect(getNextUnplayedMatch([], now)?.id).toBe("GM001");
  });
});

describe("getTodaysMatches (Eastern Time)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("groups matches by their ET date, not UTC", () => {
    // 02:00 UTC on the 12th is still 22:00 ET on the 11th. The day's matches
    // must stay the 11th's fixtures, not roll over to the 12th.
    vi.setSystemTime(new Date("2026-06-12T02:00:00Z"));
    const ids = getTodaysMatches().map((m) => m.id);
    expect(ids).toContain("GM001");
    expect(ids).toContain("GM002");
    expect(ids).not.toContain("GM003"); // GM003 is the 12th
  });
});

describe("getMatchStatus", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is upcoming before kickoff", () => {
    vi.setSystemTime(new Date(GM001_KICKOFF_UTC - 60 * 60 * 1000));
    expect(getMatchStatus(gm001, [])).toBe("upcoming");
  });

  it("is live within two hours of kickoff", () => {
    vi.setSystemTime(new Date(GM001_KICKOFF_UTC + 30 * 60 * 1000));
    expect(getMatchStatus(gm001, [])).toBe("live");
  });

  it("is completed once the live window passes, even without a result", () => {
    vi.setSystemTime(new Date(GM001_KICKOFF_UTC + 3 * 60 * 60 * 1000));
    expect(getMatchStatus(gm001, [])).toBe("completed");
  });

  it("reflects a recorded draw regardless of the clock", () => {
    vi.setSystemTime(new Date(GM001_KICKOFF_UTC - 60 * 60 * 1000));
    expect(getMatchStatus(gm001, [result("GM001", true)])).toBe("draw");
  });
});

describe("getTeamRecord", () => {
  it("tallies wins, losses, and draws", () => {
    const results: MatchResult[] = [
      { matchId: "a", winner: "MEX", loser: "RSA", isDraw: false },
      { matchId: "b", winner: "MEX", loser: "KOR", isDraw: false },
      { matchId: "c", winner: "CZE", loser: "MEX", isDraw: false },
      { matchId: "d", winner: "MEX", loser: "BRA", isDraw: true },
    ];
    expect(getTeamRecord("MEX", results)).toEqual({
      wins: 2,
      losses: 1,
      draws: 1,
    });
  });
});
