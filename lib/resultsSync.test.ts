import { describe, it, expect } from "vitest";
import {
  tickerForExternalName,
  mapExternalMatches,
  mergeResults,
  type ExternalMatch,
} from "@/lib/resultsSync";
import { TEAMS } from "@/constants/teams";
import { SCHEDULE } from "@/constants/schedule";
import type { MatchResult } from "@/hooks/useMatchResults";

function ext(over: Partial<ExternalMatch>): ExternalMatch {
  return {
    stage: "GROUP_STAGE",
    group: "GROUP_C",
    utcDate: "2026-06-13T22:00:00Z",
    homeName: "Brazil",
    awayName: "Morocco",
    status: "finished",
    homeScore: 2,
    awayScore: 1,
    winner: "home",
    ...over,
  };
}

describe("tickerForExternalName", () => {
  it("resolves every team's own name", () => {
    for (const t of TEAMS) {
      expect(tickerForExternalName(t.name)).toBe(t.ticker);
    }
  });

  it("resolves known feed spelling variants", () => {
    expect(tickerForExternalName("Turkey")).toBe("TUR");
    expect(tickerForExternalName("Côte d'Ivoire")).toBe("CIV");
    expect(tickerForExternalName("Korea Republic")).toBe("KOR");
    expect(tickerForExternalName("Czech Republic")).toBe("CZE");
    expect(tickerForExternalName("Cabo Verde")).toBe("CPV");
    expect(tickerForExternalName("DR Congo")).toBe("COD");
  });

  it("resolves the exact spellings football-data.org uses for the 2026 squads", () => {
    // Confirmed against the live /competitions/WC/matches response.
    expect(tickerForExternalName("Cape Verde Islands")).toBe("CPV");
    expect(tickerForExternalName("Congo DR")).toBe("COD");
    expect(tickerForExternalName("Bosnia-Herzegovina")).toBe("BIH");
    expect(tickerForExternalName("Turkey")).toBe("TUR");
    expect(tickerForExternalName("Ivory Coast")).toBe("CIV");
  });

  it("is diacritic- and punctuation-insensitive", () => {
    expect(tickerForExternalName("türkiye")).toBe("TUR");
    expect(tickerForExternalName("Curacao")).toBe("CUW");
  });

  it("returns null for an unknown team", () => {
    expect(tickerForExternalName("Atlantis")).toBeNull();
  });
});

describe("mapExternalMatches — group stage", () => {
  it("maps a group match by unordered team pair, regardless of home/away order", () => {
    const { live } = mapExternalMatches([
      ext({ homeName: "Morocco", awayName: "Brazil", homeScore: 0, awayScore: 3, winner: "away" }),
    ]);
    expect(live).toHaveLength(1);
    // GM006 is BRA vs MAR in the schedule.
    expect(live[0].matchId).toBe("GM006");
    expect(live[0].homeTicker).toBe("MAR");
    expect(live[0].awayTicker).toBe("BRA");
  });

  it("produces a result for a finished decisive match with scores", () => {
    const now = 1_000;
    const { finals } = mapExternalMatches([ext({})], now);
    expect(finals).toHaveLength(1);
    expect(finals[0]).toMatchObject({
      matchId: "GM006",
      winner: "BRA",
      loser: "MAR",
      isDraw: false,
      goalsWinner: 2,
      goalsLoser: 1,
      source: "api",
      timestamp: now,
    });
  });

  it("records a draw, carrying equal goals", () => {
    const { finals } = mapExternalMatches([
      ext({ homeScore: 1, awayScore: 1, winner: "draw" }),
    ]);
    expect(finals[0].isDraw).toBe(true);
    expect(finals[0].goalsWinner).toBe(1);
    expect(finals[0].goalsLoser).toBe(1);
  });

  it("does not emit a result for a live (unfinished) match", () => {
    const { live, finals } = mapExternalMatches([
      ext({ status: "live", homeScore: 1, awayScore: 0, winner: null }),
    ]);
    expect(live).toHaveLength(1);
    expect(live[0].status).toBe("live");
    expect(finals).toHaveLength(0);
  });

  it("derives the winner from scores when the feed omits it", () => {
    const { finals } = mapExternalMatches([
      ext({ winner: null, homeScore: 3, awayScore: 0 }),
    ]);
    expect(finals[0].winner).toBe("BRA");
    expect(finals[0].isDraw).toBe(false);
  });

  it("reports an unmapped match for an unknown team and skips it", () => {
    const { live, finals, unmapped } = mapExternalMatches([
      ext({ homeName: "Atlantis" }),
    ]);
    expect(live).toHaveLength(0);
    expect(finals).toHaveLength(0);
    expect(unmapped).toHaveLength(1);
  });
});

describe("mapExternalMatches — knockouts", () => {
  it("maps knockout matches to fixtures by (round, chronological index)", () => {
    // Two Round-of-32 matches; earliest utcDate maps to the earliest R32 fixture.
    const a = ext({
      stage: "LAST_32",
      group: null,
      utcDate: "2026-06-28T19:00:00Z",
      homeName: "Brazil",
      awayName: "Argentina",
      winner: "home",
      homeScore: 1,
      awayScore: 0,
    });
    const b = ext({
      stage: "LAST_32",
      group: null,
      utcDate: "2026-06-29T17:00:00Z",
      homeName: "Spain",
      awayName: "Portugal",
      winner: "away",
      homeScore: 0,
      awayScore: 2,
    });
    const r32 = SCHEDULE.filter((m) => m.groupOrRound === "Round of 32").sort(
      (x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0),
    );
    const { live, finals } = mapExternalMatches([b, a]); // unsorted input
    const byId = new Map(live.map((l) => [l.matchId, l]));
    expect(byId.get(r32[0].id)?.homeTicker).toBe("BRA");
    expect(byId.get(r32[1].id)?.awayTicker).toBe("POR");
    expect(finals.find((f) => f.matchId === r32[0].id)?.winner).toBe("BRA");
    expect(finals.find((f) => f.matchId === r32[1].id)?.winner).toBe("POR");
  });
});

describe("mergeResults", () => {
  const apiResult: MatchResult = {
    matchId: "GM006",
    winner: "BRA",
    loser: "MAR",
    isDraw: false,
    timestamp: 1,
    source: "api",
  };

  it("adds new API results", () => {
    expect(mergeResults([], [apiResult])).toHaveLength(1);
  });

  it("lets a newer API result replace an older API result", () => {
    const older = { ...apiResult, goalsWinner: 1, goalsLoser: 0, timestamp: 1 };
    const newer = { ...apiResult, goalsWinner: 3, goalsLoser: 0, timestamp: 2 };
    const merged = mergeResults([older], [newer]);
    expect(merged).toHaveLength(1);
    expect(merged[0].goalsWinner).toBe(3);
  });

  it("never overwrites a manual result with an API sync", () => {
    const manual: MatchResult = {
      ...apiResult,
      winner: "MAR",
      loser: "BRA",
      source: "manual",
    };
    const merged = mergeResults([manual], [apiResult]);
    expect(merged).toHaveLength(1);
    expect(merged[0].winner).toBe("MAR"); // manual stands
    expect(merged[0].source).toBe("manual");
  });
});
