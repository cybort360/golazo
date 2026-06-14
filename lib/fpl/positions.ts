// Maps a provider's free-text position string to our GK/DEF/MID/FWD bucket.
// Provider-agnostic (football-data uses "Centre-Back" etc.; ESPN uses
// "Defender"/"Midfielder"/"Forward"). Order matters: "Defensive/Attacking
// Midfield" are midfielders, and wide players count as midfielders the way FPL
// classes them. Unknown/blank defaults to MID so a player is never dropped.

import type { Position } from "@/lib/fpl/types";

export function mapPosition(raw: string | null): Position {
  const p = (raw ?? "").toLowerCase();
  if (/keeper|goalkeeper/.test(p)) return "GK";
  if (/midfield|winger|wing/.test(p)) return "MID";
  if (/back|defence|defender/.test(p)) return "DEF";
  if (/forward|striker|offence|attack/.test(p)) return "FWD";
  return "MID";
}
