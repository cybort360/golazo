import { mockDataSource } from "@/lib/predict/mockData";
import type { Match, PredictDataSource } from "@/lib/predict/types";

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
};
