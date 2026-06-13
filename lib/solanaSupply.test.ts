import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchTokenSupplies } from "@/lib/solanaSupply";

const RPC = "https://rpc.example";

function mockFetchOnce(json: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => json }) as unknown as Response);
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("fetchTokenSupplies", () => {
  it("returns an empty map for no mints without calling the RPC", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);
    const out = await fetchTokenSupplies([], RPC);
    expect(out.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps each mint to its ui supply via one batched call", async () => {
    const fetchMock = mockFetchOnce([
      { id: 0, result: { value: { uiAmount: 900_000_000 } } },
      { id: 1, result: { value: { uiAmount: 1_000_000_000 } } },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const out = await fetchTokenSupplies(["mintA", "mintB"], RPC);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.get("mintA")).toBe(900_000_000);
    expect(out.get("mintB")).toBe(1_000_000_000);
  });

  it("resolves a per-mint error entry to null without failing the batch", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce([
        { id: 0, result: { value: { uiAmount: 500 } } },
        { id: 1, error: { code: -32602, message: "Invalid" } },
      ]),
    );
    const out = await fetchTokenSupplies(["good", "bad"], RPC);
    expect(out.get("good")).toBe(500);
    expect(out.get("bad")).toBeNull();
  });

  it("throws on a transport error so the caller can fall back", async () => {
    vi.stubGlobal("fetch", mockFetchOnce([], false));
    await expect(fetchTokenSupplies(["m"], RPC)).rejects.toThrow();
  });

  it("throws when the RPC returns a non-array (batch rejected)", async () => {
    vi.stubGlobal("fetch", mockFetchOnce({ error: "no batch" }));
    await expect(fetchTokenSupplies(["m"], RPC)).rejects.toThrow();
  });
});
