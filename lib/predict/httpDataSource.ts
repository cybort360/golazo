import { mockDataSource } from "@/lib/predict/mockData";
import type {
  Match,
  PredictDataSource,
  ProofReceipt,
  League,
  GlobalLeaderboard,
  ProfileStats,
} from "@/lib/predict/types";

// DB-backed data source for the Picks screens: matches, leagues, the global
// leaderboard, profile, and receipts all come from Postgres (TxLINE-ingested +
// real picks) via API routes. Pools/wallet remain mock (Markets-side preview).
// Every method falls back to the mock when the DB has nothing yet, so the
// marketing/demo pages never render empty.

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

  async getMyLeagues() {
    const d = await getJson("/api/predict/league");
    if (d?.ok && Array.isArray(d.leagues) && d.leagues.length > 0) return d.leagues as League[];
    return mockDataSource.getMyLeagues();
  },

  async getLeague(code) {
    const d = await getJson(`/api/predict/league/${encodeURIComponent(code)}`);
    if (d?.ok && d.league) return d.league as League;
    return mockDataSource.getLeague(code);
  },

  async getGlobalLeaderboard() {
    const d = await getJson("/api/predict/leaderboard");
    if (d?.ok && d.board) return d.board as GlobalLeaderboard;
    return mockDataSource.getGlobalLeaderboard();
  },

  async getProfile() {
    const d = await getJson("/api/predict/profile");
    if (d?.ok && d.profile) return d.profile as ProfileStats;
    return mockDataSource.getProfile();
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
