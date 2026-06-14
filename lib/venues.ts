// The schedule stores each fixture's host city in `venue`. This maps those 16
// host cities to the actual 2026 World Cup stadium names for display. Anything
// unmapped falls back to the raw value, so it can never blank out or break.

const STADIUM_BY_CITY: Record<string, string> = {
  "Mexico City": "Estadio Azteca",
  Zapopan: "Estadio Akron",
  Monterrey: "Estadio BBVA",
  Toronto: "BMO Field",
  Vancouver: "BC Place",
  Atlanta: "Mercedes-Benz Stadium",
  Foxborough: "Gillette Stadium",
  Arlington: "AT&T Stadium",
  Houston: "NRG Stadium",
  "Kansas City": "Arrowhead Stadium",
  Inglewood: "SoFi Stadium",
  "Miami Gardens": "Hard Rock Stadium",
  "East Rutherford": "MetLife Stadium",
  Philadelphia: "Lincoln Financial Field",
  "Santa Clara": "Levi's Stadium",
  Seattle: "Lumen Field",
};

/** Stadium name for a fixture's `venue` (host city), or the raw value if unknown. */
export function stadiumName(venue: string): string {
  return STADIUM_BY_CITY[venue] ?? venue;
}
