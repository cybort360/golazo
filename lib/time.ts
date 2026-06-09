const ET_TIME_ZONE = "America/New_York";

// Offset (ms) of `timeZone` from UTC at the given instant.
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour === 24 ? 0 : map.hour,
    map.minute,
    map.second,
  );
  return asUtc - instant.getTime();
}

/**
 * Convert a fixture's ET wall-clock time to the browser's local time, e.g.
 * "15:00 BST" / "23:00 WAT" — the kickoff in the runtime's local timezone with
 * its short timezone name. Falls back to the raw time (sans " ET") if the
 * inputs can't be parsed.
 *
 * NOTE: the result depends on the runtime timezone, so it differs between the
 * server and the client. Render it only on the client (see <LocalTime>) to
 * avoid SSR hydration mismatches.
 *
 * @param date   "YYYY-MM-DD"
 * @param timeET "HH:MM ET"
 */
export function toLocalTime(date: string, timeET: string): string {
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const tm = /(\d{1,2}):(\d{2})/.exec(timeET);
  if (!dm || !tm) return timeET.replace(/\s*ET$/i, "");

  // Interpret the ET wall-clock components as UTC, then shift by the real ET
  // offset at that instant to get the true UTC moment of kickoff.
  const wallAsUtc = Date.UTC(
    Number(dm[1]),
    Number(dm[2]) - 1,
    Number(dm[3]),
    Number(tm[1]),
    Number(tm[2]),
    0,
  );
  const offset = zoneOffsetMs(new Date(wallAsUtc), ET_TIME_ZONE);
  const instant = new Date(wallAsUtc - offset);

  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";

  const hh = get("hour") === "24" ? "00" : get("hour");
  const mm = get("minute");
  const tz = get("timeZoneName");
  return tz ? `${hh}:${mm} ${tz}` : `${hh}:${mm}`;
}
