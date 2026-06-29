import { buildProfile } from "@/lib/predict/profile";
import type {
  Match,
  PredictDataSource,
  ProofReceipt,
  League,
  GlobalLeaderboard,
  LeagueMember,
  ProfileStats,
  SponsoredPool,
  WalletState,
} from "@/lib/predict/types";

// DB-backed data source for the Picks screens. Everything is REAL: matches come
// from TxLINE-ingested Postgres, leagues/leaderboard/profile/receipts from the
// user's actual picks. NO mock fallback — empty data renders honest empty states.
// Pools + wallet have no real backend yet, so they're empty (not fabricated).

async function getJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const EMPTY_YOU: LeagueMember = {
  rank: 0,
  userId: "you",
  name: "You",
  initials: "YOU",
  color: "#1e293b",
  points: 0,
  accuracy: 0,
  streak: 0,
  isYou: true,
};

const EMPTY_WALLET: WalletState = {
  eligibleRegion: true,
  connected: false,
  address: null,
  network: "Solana",
  rewards: [],
};

export const dbBackedDataSource: PredictDataSource = {
  async getMatches() {
    const d = await getJson("/api/predict/matches");
    return d?.ok && Array.isArray(d.matches) ? (d.matches as Match[]) : [];
  },

  async getMatch(id) {
    const d = await getJson(`/api/predict/matches/${encodeURIComponent(id)}`);
    return d?.ok && d.match ? (d.match as Match) : null;
  },

  async getMyLeagues() {
    const d = await getJson("/api/predict/league");
    return d?.ok && Array.isArray(d.leagues) ? (d.leagues as League[]) : [];
  },

  async getLeague(code) {
    const d = await getJson(`/api/predict/league/${encodeURIComponent(code)}`);
    return d?.ok && d.league ? (d.league as League) : null;
  },

  async getGlobalLeaderboard() {
    const d = await getJson("/api/predict/leaderboard");
    if (d?.ok && d.board) return d.board as GlobalLeaderboard;
    return { totalPlayers: 0, you: EMPTY_YOU, top: [] };
  },

  async getProfile() {
    const d = await getJson("/api/predict/profile");
    if (d?.ok && d.profile) return d.profile as ProfileStats;
    // No session/picks yet → a real zero-state profile (not a mock persona).
    return buildProfile([], {
      handle: "you",
      displayName: "You",
      initials: "YOU",
      color: "#1e293b",
      tagline: "Prove you know ball.",
      globalRank: null,
    });
  },

  // No real pools/wallet backend yet — return empty rather than fabricated data.
  async getSponsoredPools(): Promise<SponsoredPool[]> {
    return [];
  },

  async getWalletState(): Promise<WalletState> {
    return EMPTY_WALLET;
  },

  async getRecentReceipts(limit = 10) {
    const d = await getJson(`/api/predict/receipts?limit=${limit}`);
    return d?.ok && Array.isArray(d.receipts) ? (d.receipts as ProofReceipt[]) : [];
  },

  async getReceipt(pickId) {
    const d = await getJson(`/api/predict/receipts/${encodeURIComponent(pickId)}`);
    return d?.ok && d.receipt ? (d.receipt as ProofReceipt) : null;
  },
};
