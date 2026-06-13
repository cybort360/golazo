import { describe, it, expect } from "vitest";
import {
  buildTweetIntent,
  predictorCardData,
  isWeekWinner,
} from "@/lib/share";
import type { Leaderboards, LeaderRow } from "@/lib/predictions";

function row(nickname: string, points: number, correct: number, played: number): LeaderRow {
  return { id: `W_${nickname}`, nickname, wallet: `W_${nickname}`, points, correct, played };
}

const WK = "2026-W24";
const lb: Leaderboards = {
  season: [row("alice", 9, 9, 12), row("bob", 5, 5, 12)],
  weeks: {
    [WK]: [row("bob", 4, 4, 5), row("alice", 3, 3, 5)],
  },
};

describe("buildTweetIntent", () => {
  it("builds an x.com intent URL with encoded text and url", () => {
    const out = buildTweetIntent("I'm #1 🏆", "https://golazo.fun/s/predictor/bob");
    expect(out.startsWith("https://x.com/intent/tweet?")).toBe(true);
    expect(out).toContain("text=");
    expect(out).toContain(encodeURIComponent("https://golazo.fun/s/predictor/bob"));
  });
});

describe("predictorCardData", () => {
  it("prefers the current week's rank when the player played this week", () => {
    const card = predictorCardData(lb, WK, "bob");
    expect(card).toMatchObject({ nickname: "bob", rank: 1, scope: "week", correct: 4, played: 5 });
  });

  it("falls back to season standing when there's no week entry", () => {
    const card = predictorCardData(lb, "2026-W30", "alice");
    expect(card).toMatchObject({ nickname: "alice", rank: 1, scope: "season" });
  });

  it("is case-insensitive on nickname", () => {
    expect(predictorCardData(lb, WK, "BOB")?.nickname).toBe("bob");
  });

  it("returns null for an unknown nickname", () => {
    expect(predictorCardData(lb, WK, "nobody")).toBeNull();
  });
});

describe("isWeekWinner", () => {
  it("is true only for the week's current #1 with games played", () => {
    expect(isWeekWinner(lb, WK, "bob")).toBe(true);
    expect(isWeekWinner(lb, WK, "alice")).toBe(false);
  });

  it("is false for an empty or unplayed week", () => {
    expect(isWeekWinner(lb, "2026-W30", "bob")).toBe(false);
    const zero: Leaderboards = { season: [], weeks: { [WK]: [row("x", 0, 0, 0)] } };
    expect(isWeekWinner(zero, WK, "x")).toBe(false);
  });
});
