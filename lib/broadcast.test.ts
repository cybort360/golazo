import { describe, it, expect, vi } from "vitest";
import {
  composeBroadcasts,
  applyEvent,
  predictButton,
  type BroadcastState,
  type PostedRecord,
} from "@/lib/broadcast";
import type { MatchResult } from "@/hooks/useMatchResults";
import type { BuybackEntry } from "@/lib/buyback";

function state(over: Partial<BroadcastState> = {}): BroadcastState {
  return { results: [], buybacks: [], weeklyPrize: null, champion: null, ...over };
}

function emptyPosted(): PostedRecord {
  return { results: [], buybacks: [], weeklyKey: null, champion: null };
}

const braResult: MatchResult = {
  matchId: "GM006",
  winner: "BRA",
  loser: "MAR",
  isDraw: false,
  goalsWinner: 2,
  goalsLoser: 1,
  timestamp: 0,
  source: "api",
};

const braBuyback: BuybackEntry = {
  matchId: "GM006",
  matchLabel: "BRA vs MAR",
  teamId: "BRA",
  teamName: "Brazil",
  tokensBurned: "1.2M",
  txUrl: "https://solscan.io/tx/abc",
  timestamp: 0,
};

describe("composeBroadcasts — first run (anti-flood)", () => {
  it("posts nothing and seeds a baseline when there's no posted record", () => {
    const { events, baseline } = composeBroadcasts(
      state({ results: [braResult], buybacks: [braBuyback], champion: "ARG" }),
      null,
    );
    expect(events).toHaveLength(0);
    expect(baseline.results).toEqual(["GM006"]);
    expect(baseline.buybacks).toEqual(["GM006"]);
    expect(baseline.champion).toBe("ARG");
  });
});

describe("composeBroadcasts — diffing", () => {
  it("emits a result event the first time, then never again", () => {
    const first = composeBroadcasts(state({ results: [braResult] }), emptyPosted());
    expect(first.events.map((e) => e.type)).toEqual(["result"]);
    expect(first.events[0].text).toContain("2–1");
    expect(first.events[0].text).toContain("$BRA");

    const posted = applyEvent(emptyPosted(), first.events[0]);
    const second = composeBroadcasts(state({ results: [braResult] }), posted);
    expect(second.events).toHaveLength(0);
  });

  it("emits a buyback event with the burn tx link", () => {
    const { events } = composeBroadcasts(
      state({ buybacks: [braBuyback] }),
      emptyPosted(),
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("buyback");
    expect(events[0].text).toContain("1.2M");
    expect(events[0].text).toContain("https://solscan.io/tx/abc");
  });

  it("emits a weekly event when the week/match key changes", () => {
    const wp = { matchId: "GM072", potSol: 5, status: "upcoming" as const, winnerTeamId: null, txHash: null, week: 2 };
    const posted = { ...emptyPosted(), weeklyKey: "1:GM050" };
    const { events } = composeBroadcasts(state({ weeklyPrize: wp }), posted);
    expect(events.map((e) => e.type)).toEqual(["weekly"]);
    expect(events[0].id).toBe("2:GM072");
    expect(events[0].text).toContain("5 SOL");
  });

  it("does not re-emit the same weekly prize", () => {
    const wp = { matchId: "GM072", potSol: 5, status: "upcoming" as const, winnerTeamId: null, txHash: null, week: 2 };
    const posted = { ...emptyPosted(), weeklyKey: "2:GM072" };
    expect(composeBroadcasts(state({ weeklyPrize: wp }), posted).events).toHaveLength(0);
  });

  it("emits a champion event once", () => {
    const { events } = composeBroadcasts(state({ champion: "BRA" }), emptyPosted());
    expect(events.map((e) => e.type)).toEqual(["champion"]);
    const posted = applyEvent(emptyPosted(), events[0]);
    expect(composeBroadcasts(state({ champion: "BRA" }), posted).events).toHaveLength(0);
  });

  it("escapes HTML in admin-entered burn amounts", () => {
    const sneaky: BuybackEntry = { ...braBuyback, tokensBurned: "1M <b>x</b>" };
    const { events } = composeBroadcasts(state({ buybacks: [sneaky] }), emptyPosted());
    expect(events[0].text).toContain("&lt;b&gt;");
    expect(events[0].text).not.toContain("1M <b>x</b>");
  });

  it("appends a predict CTA link when the site URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://golazo.fun");
    const { events } = composeBroadcasts(state({ results: [braResult] }), emptyPosted());
    expect(events[0].text).toContain("https://golazo.fun/predict");
    vi.unstubAllEnvs();
  });

  it("omits the CTA when no site URL is set", () => {
    const { events } = composeBroadcasts(state({ results: [braResult] }), emptyPosted());
    expect(events[0].text).not.toContain("/predict");
  });

  it("suppresses the text CTA when a Mini App link is set (button is used)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://golazo.fun");
    vi.stubEnv("NEXT_PUBLIC_TELEGRAM_APP_URL", "https://t.me/golazo_feed_bot/predict");
    const { events } = composeBroadcasts(state({ results: [braResult] }), emptyPosted());
    expect(events[0].text).not.toContain("/predict");
    vi.unstubAllEnvs();
  });
});

describe("predictButton", () => {
  it("is an inline button to the Mini App when configured, else undefined", () => {
    vi.stubEnv("NEXT_PUBLIC_TELEGRAM_APP_URL", "https://t.me/golazo_feed_bot/predict");
    expect(predictButton()).toMatchObject({
      inline_keyboard: [[{ url: "https://t.me/golazo_feed_bot/predict" }]],
    });
    vi.unstubAllEnvs();
    expect(predictButton()).toBeUndefined();
  });
});

describe("applyEvent", () => {
  it("records each event type in the posted record", () => {
    let posted = emptyPosted();
    posted = applyEvent(posted, { type: "result", id: "GM001", text: "" });
    posted = applyEvent(posted, { type: "buyback", id: "GM001", text: "" });
    posted = applyEvent(posted, { type: "weekly", id: "1:GM050", text: "" });
    posted = applyEvent(posted, { type: "champion", id: "BRA", text: "" });
    expect(posted).toEqual({
      results: ["GM001"],
      buybacks: ["GM001"],
      weeklyKey: "1:GM050",
      champion: "BRA",
    });
  });
});
