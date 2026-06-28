// Telegram broadcast reconciler. Diffs the current tournament state against a
// record of what's already been announced (tg_posted in KV) and posts a message
// for each new event. The diff/format logic (composeBroadcasts, applyEvent) is
// pure and dependency-free so it's fully unit-testable; broadcastPending wires
// it to KV and the Telegram provider.

import { kv } from "@vercel/kv";
import { TEAMS } from "@/constants/teams";
import type { MatchResult } from "@/hooks/useMatchResults";
import { sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

export interface BroadcastState {
  results: MatchResult[];
  champion: string | null;
}

export interface PostedRecord {
  results: string[]; // matchIds already announced
  champion: string | null; // ticker already announced
}

export type BroadcastType = "result" | "champion";
export interface BroadcastEvent {
  type: BroadcastType;
  id: string;
  text: string;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Country flag emoji from a 2-letter ISO code; "" for codes without one. */
function flagEmoji(flagCode: string): string {
  if (!/^[a-z]{2}$/.test(flagCode)) return "";
  const up = flagCode.toUpperCase();
  return String.fromCodePoint(
    0x1f1e6 + up.charCodeAt(0) - 65,
    0x1f1e6 + up.charCodeAt(1) - 65,
  );
}

function label(ticker: string): string {
  const team = TEAM_BY_TICKER.get(ticker);
  const flag = team ? flagEmoji(team.flagCode) : "";
  const name = team?.name ?? ticker;
  return `${flag ? `${flag} ` : ""}${escapeHtml(name)}`;
}

function scoreText(r: MatchResult): string {
  return r.goalsWinner != null && r.goalsLoser != null
    ? ` ${r.goalsWinner}–${r.goalsLoser}`
    : "";
}

function formatResult(r: MatchResult): string {
  if (r.isDraw) {
    return `⚽ <b>FT</b> — ${label(r.winner)}${scoreText(r)} ${label(r.loser)} — Draw.`;
  }
  return `⚽ <b>FT</b> — ${label(r.winner)}${scoreText(r)} ${label(r.loser)}\n${label(r.winner)} takes it. 🏆`;
}

function formatChampion(ticker: string): string {
  return `👑 ${label(ticker)} are World Cup champions!`;
}

// ── Pure diff ─────────────────────────────────────────────────────────────────

function baselineFrom(state: BroadcastState): PostedRecord {
  return {
    results: state.results.map((r) => r.matchId),
    champion: state.champion,
  };
}

/**
 * Events to announce given the current state and what's already been posted.
 *
 * `posted === null` means the bot was just configured: we return no events and
 * a baseline snapshot so the channel isn't flooded with the entire backlog —
 * only events that happen after setup get announced.
 */
export function composeBroadcasts(
  state: BroadcastState,
  posted: PostedRecord | null,
): { events: BroadcastEvent[]; baseline: PostedRecord } {
  const baseline = baselineFrom(state);
  if (posted === null) return { events: [], baseline };

  const events: BroadcastEvent[] = [];

  for (const r of state.results) {
    if (!posted.results.includes(r.matchId)) {
      events.push({ type: "result", id: r.matchId, text: formatResult(r) });
    }
  }
  if (state.champion && state.champion !== posted.champion) {
    events.push({
      type: "champion",
      id: state.champion,
      text: formatChampion(state.champion),
    });
  }

  return { events, baseline };
}

/** Apply one successfully-sent event to the posted record (immutably). */
export function applyEvent(
  posted: PostedRecord,
  event: BroadcastEvent,
): PostedRecord {
  switch (event.type) {
    case "result":
      return { ...posted, results: [...posted.results, event.id] };
    case "champion":
      return { ...posted, champion: event.id };
  }
}

// ── KV-wired reconciler ───────────────────────────────────────────────────────

const POSTED_KEY = "tg_posted";
const LOCK_KEY = "tg_lock";
const LOCK_MS = 15_000;

/**
 * Read state, post any new events to Telegram, and record what was sent. Safe
 * to call from multiple triggers: a single-flight lock plus the posted-record
 * diff make double-posting structurally impossible. Never throws.
 */
export async function broadcastPending(): Promise<void> {
  if (!telegramConfigured()) return;

  try {
    const gotLock = await kv.set(LOCK_KEY, Date.now(), {
      nx: true,
      px: LOCK_MS,
    });
    if (gotLock !== "OK") return;
  } catch {
    return; // KV unavailable
  }

  try {
    const [results, champion, posted] = await Promise.all([
      kv.get<MatchResult[]>("match_results"),
      kv.get<string>("champion"),
      kv.get<PostedRecord>(POSTED_KEY),
    ]);

    const state: BroadcastState = {
      results: results ?? [],
      champion: champion ?? null,
    };

    const { events, baseline } = composeBroadcasts(state, posted ?? null);

    // First run: seed the baseline and stay silent (no backlog flood).
    if (!posted) {
      await kv.set(POSTED_KEY, baseline);
      return;
    }

    let current = posted;
    for (const event of events) {
      const sent = await sendTelegramMessage(event.text);
      if (!sent) break; // stop; unsent events retry on the next trigger
      current = applyEvent(current, event);
      await kv.set(POSTED_KEY, current); // persist progress after each send
    }
  } catch {
    // swallow — broadcasting must never break the caller
  } finally {
    try {
      await kv.del(LOCK_KEY);
    } catch {
      /* ignore */
    }
  }
}
