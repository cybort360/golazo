// Shared "what can I predict right now" logic, used by both the web predict
// page and the Telegram Mini App. Pure: upcoming matches with known
// participants, soonest first, with the allowed pick options.

import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { getKickoffMs } from "@/lib/schedule";
import { DRAW } from "@/lib/predictions";

const TICKERS = new Set(TEAMS.map((t) => t.ticker));
const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));

export interface PickOption {
  value: string; // ticker or DRAW
  label: string;
  flagCode: string | null;
}

export interface SlateEntry {
  match: ScheduledMatch;
  options: PickOption[];
}

function teamOption(ticker: string): PickOption {
  const t = TEAM_BY_TICKER.get(ticker);
  return { value: ticker, label: ticker, flagCode: t?.flagCode ?? null };
}

/** Upcoming matches with known participants, soonest first (max 12). Knockout
 *  teams come from the live snapshot once the bracket fills. */
export function buildSlate(
  now: number | null,
  liveByMatchId: Record<string, { homeTicker: string; awayTicker: string }>,
): SlateEntry[] {
  if (now === null) return [];
  const entries: SlateEntry[] = [];
  for (const m of SCHEDULE) {
    if (getKickoffMs(m) <= now) continue;
    if (TICKERS.has(m.teamA) && TICKERS.has(m.teamB)) {
      entries.push({
        match: m,
        options: [
          teamOption(m.teamA),
          { value: DRAW, label: "Draw", flagCode: null },
          teamOption(m.teamB),
        ],
      });
    } else {
      const live = liveByMatchId[m.id];
      if (live && TICKERS.has(live.homeTicker) && TICKERS.has(live.awayTicker)) {
        entries.push({
          match: m,
          options: [teamOption(live.homeTicker), teamOption(live.awayTicker)],
        });
      }
    }
  }
  return entries
    .sort((a, b) => getKickoffMs(a.match) - getKickoffMs(b.match))
    .slice(0, 12);
}
