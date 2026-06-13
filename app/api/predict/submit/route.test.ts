// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const h = vi.hoisted(() => ({ store: new Map<string, unknown>() }));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(async (k: string) => (h.store.has(k) ? h.store.get(k) : null)),
    set: vi.fn(async (k: string, v: unknown) => {
      h.store.set(k, v);
      return "OK";
    }),
  },
}));

import { POST } from "@/app/api/predict/submit/route";

function req(body: unknown, token = "tok"): Request {
  return new Request("http://x/api/predict/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  h.store.clear();
  h.store.set("pred:token:tok", "WALLET"); // a registered player
  vi.useFakeTimers();
  // Midday June 13: GM005 (19:00Z) is upcoming, GM001 (June 11) is locked.
  vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("POST /api/predict/submit", () => {
  it("saves a valid group-stage pick", async () => {
    const res = await POST(req({ token: "tok", matchId: "GM005", pick: "QAT" }));
    expect(res.status).toBe(200);
    expect(h.store.get("pred:picks:WALLET")).toEqual({ GM005: "QAT" });
  });

  it("accepts a draw pick on a group match", async () => {
    const res = await POST(req({ token: "tok", matchId: "GM005", pick: "draw" }));
    expect(res.status).toBe(200);
  });

  it("rejects a pick not among the fixture's teams", async () => {
    const res = await POST(req({ token: "tok", matchId: "GM005", pick: "BRA" }));
    expect(res.status).toBe(400);
  });

  it("rejects an unregistered token", async () => {
    const res = await POST(req({ matchId: "GM005", pick: "QAT" }, "nope"));
    expect(res.status).toBe(401);
  });

  it("rejects a pick after kickoff (locked)", async () => {
    const res = await POST(req({ token: "tok", matchId: "GM001", pick: "MEX" }));
    expect(res.status).toBe(409);
  });

  it("rejects a knockout match whose teams aren't resolved yet", async () => {
    // GM073 (Round of 32) is upcoming but has no live snapshot → not open.
    const res = await POST(req({ token: "tok", matchId: "GM073", pick: "BRA" }));
    expect(res.status).toBe(409);
  });
});
