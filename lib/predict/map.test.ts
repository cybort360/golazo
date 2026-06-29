import { describe, it, expect } from "vitest";
import { dbMatchToUi, type DbMatchRow } from "@/lib/predict/map";

const row: DbMatchRow = {
  id: "WC-B-ENG-GER",
  competition: "World Cup 2026",
  round: "Group B",
  homeTeam: "England",
  awayTeam: "Germany",
  homeTicker: "ENG",
  awayTicker: "GER",
  homeFlag: "gb-eng",
  awayFlag: "de",
  homeColor: "#cf142b",
  awayColor: "#111111",
  kickoff: new Date(1_000_000),
  lockAt: new Date(900_000),
  status: "LIVE",
  minute: 67,
  homeScore: 1,
  awayScore: 0,
};

describe("dbMatchToUi", () => {
  it("maps a DB row to the UI Match shape", () => {
    const m = dbMatchToUi(row);
    expect(m).toMatchObject({
      id: "WC-B-ENG-GER",
      competition: "World Cup 2026",
      round: "Group B",
      kickoffMs: 1_000_000,
      lockMs: 900_000,
      state: "LIVE",
      minute: 67,
      phaseLabel: "2nd half",
      homeScore: 1,
      awayScore: 0,
    });
    expect(m.home).toMatchObject({ ticker: "ENG", name: "England", color: "#cf142b" });
  });

  it("derives phase labels and tolerates an unknown state", () => {
    expect(dbMatchToUi({ ...row, status: "HT", minute: 45 }).phaseLabel).toBe("Half time");
    expect(dbMatchToUi({ ...row, status: "FT", minute: 90 }).phaseLabel).toBe("Full time");
    expect(dbMatchToUi({ ...row, status: "NOT_STARTED", minute: null }).phaseLabel).toBeNull();
    expect(dbMatchToUi({ ...row, status: "weird" }).state).toBe("NOT_STARTED");
  });

  it("falls back when optional team meta is missing", () => {
    const m = dbMatchToUi({ ...row, homeTicker: null, homeColor: null });
    expect(m.home.ticker).toBe("ENG"); // derived from name
    expect(m.home.color).toBe("#334155");
  });
});
