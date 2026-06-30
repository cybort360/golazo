import type { Match } from "@/lib/predict/types";

// Date windows for the Matches tab pills (Today / Tomorrow / This week).
export type DateFilter = "today" | "tomorrow" | "week";

export const DATE_TABS: { id: DateFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This week" },
];

const DAY_MS = 86_400_000;

// Filter matches by kickoff date relative to the local day. "Today" also keeps
// anything currently in-play (it kicked off today). "This week" spans today
// through the next 7 days so it's a superset of Today + Tomorrow.
export function filterByDate(matches: Match[], filter: DateFilter, now = Date.now()): Match[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();

  return matches.filter((m) => {
    const k = m.kickoffMs;
    if (filter === "today") {
      if (m.state === "LIVE" || m.state === "HT") return true;
      return k >= startMs && k < startMs + DAY_MS;
    }
    if (filter === "tomorrow") {
      return k >= startMs + DAY_MS && k < startMs + 2 * DAY_MS;
    }
    return k >= startMs && k < startMs + 7 * DAY_MS;
  });
}
