// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

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

import { POST as LOCK } from "@/app/api/predict/lock/route";
import { POST as SUBMIT } from "@/app/api/predict/submit/route";

function req(url: string, body: unknown, token = "tok"): Request {
  return new Request(url, {
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
  h.store.set("pred:token:tok", "WALLET");
  h.store.set("pred:picks:WALLET", { GM005: "QAT" });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-13T12:00:00Z")); // before GM005 kickoff
});

describe("POST /api/predict/lock", () => {
  it("locks a pick that exists", async () => {
    const res = await LOCK(req("http://x/lock", { matchId: "GM005" }));
    expect(res.status).toBe(200);
    expect(h.store.get("pred:locked:WALLET")).toEqual(["GM005"]);
  });

  it("won't lock a match with no pick", async () => {
    const res = await LOCK(req("http://x/lock", { matchId: "GM006" }));
    expect(res.status).toBe(400);
  });

  it("rejects an unregistered caller", async () => {
    const res = await LOCK(req("http://x/lock", { matchId: "GM005" }, "nope"));
    expect(res.status).toBe(401);
  });

  it("makes the pick unchangeable: submit is then rejected", async () => {
    await LOCK(req("http://x/lock", { matchId: "GM005" }));
    const res = await SUBMIT(req("http://x/submit", { matchId: "GM005", pick: "SUI" }));
    expect(res.status).toBe(409);
  });
});
