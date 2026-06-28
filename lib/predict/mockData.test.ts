import { describe, it, expect } from "vitest";
import { mockDataSource } from "@/lib/predict/mockData";

describe("mockDataSource", () => {
  it("returns matches with at least one live game", async () => {
    const matches = await mockDataSource.getMatches();
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.state === "LIVE")).toBe(true);
  });
  it("looks up a match by id", async () => {
    const all = await mockDataSource.getMatches();
    const one = await mockDataSource.getMatch(all[0].id);
    expect(one?.id).toBe(all[0].id);
    expect(await mockDataSource.getMatch("nope")).toBeNull();
  });
  it("returns a league with a pinned 'you' row", async () => {
    const leagues = await mockDataSource.getMyLeagues();
    const me = leagues[0].members.find((m) => m.isYou);
    expect(me).toBeTruthy();
  });
  it("returns recent receipts capped by limit", async () => {
    const r = await mockDataSource.getRecentReceipts(1);
    expect(r.length).toBe(1);
  });
});
