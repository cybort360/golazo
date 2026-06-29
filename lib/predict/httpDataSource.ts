import { mockDataSource } from "@/lib/predict/mockData";
import type { Match, PredictDataSource, ProofReceipt } from "@/lib/predict/types";

// DB-backed data source for the Picks screens: matches come from the TxLINE-
// ingested Postgres via API routes; everything else (leagues/profile/pools/
// wallet/receipts) still falls back to the mock until those screens are wired.
// Matches also fall back to mock when the DB is empty, so the UI never breaks.

async function getJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export const dbBackedDataSource: PredictDataSource = {
  ...mockDataSource,

  async getMatches() {
    const d = await getJson("/api/predict/matches");
    if (d?.ok && Array.isArray(d.matches) && d.matches.length > 0) return d.matches as Match[];
    return mockDataSource.getMatches();
  },

  async getMatch(id) {
    const d = await getJson(`/api/predict/matches/${encodeURIComponent(id)}`);
    if (d?.ok && d.match) return d.match as Match;
    return mockDataSource.getMatch(id);
  },

  async getRecentReceipts(limit = 10) {
    const d = await getJson(`/api/predict/receipts?limit=${limit}`);
    if (d?.ok && Array.isArray(d.receipts) && d.receipts.length > 0) return d.receipts as ProofReceipt[];
    return mockDataSource.getRecentReceipts(limit); // demo fallback until the user has settled picks
  },

  async getReceipt(pickId) {
    const d = await getJson(`/api/predict/receipts/${encodeURIComponent(pickId)}`);
    if (d?.ok && d.receipt) return d.receipt as ProofReceipt;
    return mockDataSource.getReceipt(pickId);
  },
};
