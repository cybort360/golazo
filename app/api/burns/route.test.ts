// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { BurnStat } from "@/lib/burns";

const h = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  failGet: false,
  fetchSupplies: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(async (key: string) => {
      if (h.failGet) throw new Error("kv down");
      return h.store.has(key) ? h.store.get(key) : null;
    }),
    set: vi.fn(async (key: string, value: unknown, opts?: { nx?: boolean }) => {
      if (opts?.nx && h.store.has(key)) return null;
      h.store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key: string) => {
      h.store.delete(key);
    }),
  },
}));

vi.mock("@/lib/solanaSupply", () => ({
  fetchTokenSupplies: h.fetchSupplies,
}));

import { GET } from "@/app/api/burns/route";

async function body(res: Response): Promise<{ burns: BurnStat[]; fetchedAt: number }> {
  return res.json();
}

beforeEach(() => {
  h.store.clear();
  h.failGet = false;
  h.fetchSupplies.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_SOLANA_RPC_URL", "https://rpc.example");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/burns", () => {
  it("returns empty when no tokens are launched, without hitting the RPC", async () => {
    const data = await body(await GET());
    expect(data.burns).toHaveLength(0);
    expect(h.fetchSupplies).not.toHaveBeenCalled();
  });

  it("computes burn % from on-chain supply for launched tokens", async () => {
    h.store.set("token_addresses", {
      BRA: { address: "mintBRA", meteoraUrl: "", axiomUrl: "" },
    });
    h.fetchSupplies.mockResolvedValue(new Map([["mintBRA", 900_000_000]]));

    const data = await body(await GET());

    expect(h.fetchSupplies).toHaveBeenCalledTimes(1);
    expect(data.burns).toEqual([
      { ticker: "BRA", percentBurned: 10, currentSupply: 900_000_000 },
    ]);
    // Supplies were cached for next time.
    expect(h.store.has("burn_supplies")).toBe(true);
  });

  it("sorts most-burned first and omits tokens with unknown supply", async () => {
    h.store.set("token_addresses", {
      BRA: { address: "mintBRA", meteoraUrl: "", axiomUrl: "" },
      ARG: { address: "mintARG", meteoraUrl: "", axiomUrl: "" },
      ESP: { address: "mintESP", meteoraUrl: "", axiomUrl: "" },
    });
    h.fetchSupplies.mockResolvedValue(
      new Map<string, number | null>([
        ["mintBRA", 950_000_000], // 5%
        ["mintARG", 800_000_000], // 20%
        ["mintESP", null], // unknown → omitted
      ]),
    );

    const data = await body(await GET());

    expect(data.burns.map((b) => b.ticker)).toEqual(["ARG", "BRA"]);
  });

  it("serves the cache without re-fetching when fresh", async () => {
    h.store.set("token_addresses", {
      BRA: { address: "mintBRA", meteoraUrl: "", axiomUrl: "" },
    });
    h.store.set("burn_supplies", {
      fetchedAt: Date.now() - 1000, // 1s old → fresh
      byMint: { mintBRA: 700_000_000 },
    });

    const data = await body(await GET());

    expect(h.fetchSupplies).not.toHaveBeenCalled();
    expect(data.burns[0]).toMatchObject({ ticker: "BRA", percentBurned: 30 });
  });

  it("degrades to empty when KV is unreachable", async () => {
    h.store.set("token_addresses", {
      BRA: { address: "mintBRA", meteoraUrl: "", axiomUrl: "" },
    });
    h.failGet = true;
    const data = await body(await GET());
    expect(data.burns).toHaveLength(0);
  });
});
