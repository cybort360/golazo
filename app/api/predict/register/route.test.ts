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

import { POST } from "@/app/api/predict/register/route";

const WALLET = "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9";

function req(body: unknown, ip = "1.1.1.1"): Request {
  return new Request("http://x/api/predict/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => h.store.clear());

describe("POST /api/predict/register", () => {
  it("registers a new nickname + wallet and returns a token", async () => {
    const res = await POST(req({ nickname: "degen_1", wallet: WALLET }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(typeof data.token).toBe("string");
    expect(h.store.get(`pred:player:${WALLET}`)).toMatchObject({
      nickname: "degen_1",
      wallet: WALLET,
    });
    expect(h.store.get("pred:players")).toEqual([WALLET]);
  });

  it("rejects a duplicate wallet", async () => {
    await POST(req({ nickname: "degen_1", wallet: WALLET }));
    const res = await POST(req({ nickname: "other", wallet: WALLET }, "2.2.2.2"));
    expect(res.status).toBe(409);
  });

  it("rejects a duplicate nickname (case-insensitive)", async () => {
    await POST(req({ nickname: "Degen", wallet: WALLET }));
    const other = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
    const res = await POST(req({ nickname: "degen", wallet: other }, "3.3.3.3"));
    expect(res.status).toBe(409);
  });

  it("rejects an invalid nickname", async () => {
    const res = await POST(req({ nickname: "no", wallet: WALLET }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid wallet", async () => {
    const res = await POST(req({ nickname: "valid_name", wallet: "nope" }));
    expect(res.status).toBe(400);
  });
});
