// Telegram broadcast reconciler. Diffs the current tournament state against a
// record of what's already been announced (tg_posted in KV) and posts a message
// for each new event. The diff/format logic (composeBroadcasts, applyEvent) is
// pure and dependency-free so it's fully unit-testable; broadcastPending wires
// it to KV and the Telegram provider.

import { kv } from "@vercel/kv";
import { SCHEDULE } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import type { MatchResult } from "@/hooks/useMatchResults";
import type { BuybackEntry } from "@/lib/buyback";
import type { WeeklyPrize } from "@/lib/weeklyPrize";
import { sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

export interface BroadcastState {
  results: MatchResult[];
  buybacks: BuybackEntry[];
  weeklyPrize: WeeklyPrize | null;
  champion: string | null;
}

export interface PostedRecord {
  results: string[]; // matchIds already announced
  buybacks: string[]; // matchIds already announced
  weeklyKey: string | null; // `${week}:${matchId}` already announced
  champion: string | null; // ticker already announced
}

export type BroadcastType = "result" | "buyback" | "weekly" | "champion";
export interface BroadcastEvent {
  type: BroadcastType;
  id: string;
  text: string;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));
const FIXTURE_BY_ID = new Map(SCHEDULE.map((m) => [m.id, m]));

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
  return `⚽ <b>FT</b> — ${label(r.winner)}${scoreText(r)} ${label(r.loser)}\n$${r.winner} takes it. 🏆`;
}

function formatBuyback(b: BuybackEntry): string {
  return (
    `🔥 <b>Buyback</b> — burned ${escapeHtml(b.tokensBurned)} $${escapeHtml(b.teamId)} after the win.\n` +
    `Supply only goes down. <a href="${b.txUrl}">View the burn ↗</a>`
  );
}

function formatWeekly(wp: WeeklyPrize): string {
  const fixture = FIXTURE_BY_ID.get(wp.matchId);
  const match = fixture
    ? `${label(fixture.teamA)} vs ${label(fixture.teamB)}`
    : "this week's match";
  return (
    `💰 <b>Week ${wp.week} Prize Match</b> — ${match}\n` +
    `Hold the winner's token at kickoff to split <b>${wp.potSol} SOL</b>.`
  );
}

function formatChampion(ticker: string): string {
  return (
    `👑 ${label(ticker)} are World Cup champions!\n` +
    `Prize-pool airdrop incoming to $${ticker} holders.`
  );
}

// CTA back to the prediction game, appended to every post. Read at call time
// (not module load) so it picks up the env and stays testable. Omitted if
// NEXT_PUBLIC_SITE_URL isn't set, since a relative link isn't clickable in TG.
function predictCta(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return site
    ? `\n\n🔮 <a href="${site}/predict">Predict &amp; win SOL</a>`
    : "";
}

// ── Pure diff ─────────────────────────────────────────────────────────────────

function baselineFrom(state: BroadcastState): PostedRecord {
  return {
    results: state.results.map((r) => r.matchId),
    buybacks: state.buybacks.map((b) => b.matchId),
    weeklyKey: state.weeklyPrize
      ? `${state.weeklyPrize.week}:${state.weeklyPrize.matchId}`
      : null,
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
  for (const b of state.buybacks) {
    if (!posted.buybacks.includes(b.matchId)) {
      events.push({ type: "buyback", id: b.matchId, text: formatBuyback(b) });
    }
  }
  if (state.weeklyPrize) {
    const key = `${state.weeklyPrize.week}:${state.weeklyPrize.matchId}`;
    if (key !== posted.weeklyKey) {
      events.push({ type: "weekly", id: key, text: formatWeekly(state.weeklyPrize) });
    }
  }
  if (state.champion && state.champion !== posted.champion) {
    events.push({
      type: "champion",
      id: state.champion,
      text: formatChampion(state.champion),
    });
  }

  // Append the predict CTA to every post.
  const cta = predictCta();
  return {
    events: cta ? events.map((e) => ({ ...e, text: e.text + cta })) : events,
    baseline,
  };
}

/** Apply one successfully-sent event to the posted record (immutably). */
export function applyEvent(
  posted: PostedRecord,
  event: BroadcastEvent,
): PostedRecord {
  switch (event.type) {
    case "result":
      return { ...posted, results: [...posted.results, event.id] };
    case "buyback":
      return { ...posted, buybacks: [...posted.buybacks, event.id] };
    case "weekly":
      return { ...posted, weeklyKey: event.id };
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
    const [results, buybacks, weeklyPrize, champion, posted] =
      await Promise.all([
        kv.get<MatchResult[]>("match_results"),
        kv.get<BuybackEntry[]>("buyback_history"),
        kv.get<WeeklyPrize>("weekly_prize"),
        kv.get<string>("champion"),
        kv.get<PostedRecord>(POSTED_KEY),
      ]);

    const state: BroadcastState = {
      results: results ?? [],
      buybacks: buybacks ?? [],
      weeklyPrize: weeklyPrize ?? null,
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
