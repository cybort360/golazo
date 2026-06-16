export interface Team {
  ticker: string; // e.g. "BRA"
  name: string; // e.g. "Brazil"
  flagCode: string; // flag-icons code, e.g. "br" (or "gb-eng" / "gb-sct")
  group: string; // "A" through "L"
  listed: boolean; // whether this team gets a tradeable token at all (the launch
  // decision). false = info-only (no market), independent of tokenAddress, which
  // distinguishes "launching soon" (listed, null address) from "live" (address set).
  tokenAddress: string | null; // Solana token mint, null until launched
  meteoraUrl: string | null; // Meteora pool page URL
  axiomUrl: string | null; // axiom.trade token page URL
}

// Official 2026 FIFA World Cup final draw (Washington, D.C., December 5, 2025).
// 48 teams, 12 groups (A–L), 4 teams per group.
//
// We list tokens for 24 of the 48 — the contenders and biggest markets (FIFA
// top sides + the three hosts + high-value markets/stars). The other 24 stay in
// the tournament (standings, fantasy, predictions) but carry `listed: false`:
// no token, an info-only page, and no buy CTAs.
export const TEAMS: Team[] = [
  // Group A
  { ticker: "MEX", name: "Mexico", flagCode: "mx", group: "A", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "RSA", name: "South Africa", flagCode: "za", group: "A", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "KOR", name: "South Korea", flagCode: "kr", group: "A", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "CZE", name: "Czechia", flagCode: "cz", group: "A", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group B
  { ticker: "CAN", name: "Canada", flagCode: "ca", group: "B", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "BIH", name: "Bosnia and Herzegovina", flagCode: "ba", group: "B", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "QAT", name: "Qatar", flagCode: "qa", group: "B", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "SUI", name: "Switzerland", flagCode: "ch", group: "B", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group C
  { ticker: "BRA", name: "Brazil", flagCode: "br", group: "C", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "MAR", name: "Morocco", flagCode: "ma", group: "C", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "HAI", name: "Haiti", flagCode: "ht", group: "C", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "SCO", name: "Scotland", flagCode: "gb-sct", group: "C", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group D
  { ticker: "USA", name: "United States", flagCode: "us", group: "D", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "PAR", name: "Paraguay", flagCode: "py", group: "D", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "AUS", name: "Australia", flagCode: "au", group: "D", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "TUR", name: "Türkiye", flagCode: "tr", group: "D", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group E
  { ticker: "GER", name: "Germany", flagCode: "de", group: "E", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "CUW", name: "Curaçao", flagCode: "cw", group: "E", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "CIV", name: "Ivory Coast", flagCode: "ci", group: "E", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "ECU", name: "Ecuador", flagCode: "ec", group: "E", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group F
  { ticker: "NED", name: "Netherlands", flagCode: "nl", group: "F", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "JPN", name: "Japan", flagCode: "jp", group: "F", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "SWE", name: "Sweden", flagCode: "se", group: "F", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "TUN", name: "Tunisia", flagCode: "tn", group: "F", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group G
  { ticker: "BEL", name: "Belgium", flagCode: "be", group: "G", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "EGY", name: "Egypt", flagCode: "eg", group: "G", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "IRN", name: "Iran", flagCode: "ir", group: "G", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "NZL", name: "New Zealand", flagCode: "nz", group: "G", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group H
  { ticker: "ESP", name: "Spain", flagCode: "es", group: "H", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "CPV", name: "Cape Verde", flagCode: "cv", group: "H", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "KSA", name: "Saudi Arabia", flagCode: "sa", group: "H", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "URU", name: "Uruguay", flagCode: "uy", group: "H", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group I
  { ticker: "FRA", name: "France", flagCode: "fr", group: "I", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "SEN", name: "Senegal", flagCode: "sn", group: "I", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "IRQ", name: "Iraq", flagCode: "iq", group: "I", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "NOR", name: "Norway", flagCode: "no", group: "I", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group J
  { ticker: "ARG", name: "Argentina", flagCode: "ar", group: "J", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "ALG", name: "Algeria", flagCode: "dz", group: "J", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "AUT", name: "Austria", flagCode: "at", group: "J", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "JOR", name: "Jordan", flagCode: "jo", group: "J", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group K
  { ticker: "POR", name: "Portugal", flagCode: "pt", group: "K", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "COD", name: "DR Congo", flagCode: "cd", group: "K", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "UZB", name: "Uzbekistan", flagCode: "uz", group: "K", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "COL", name: "Colombia", flagCode: "co", group: "K", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },

  // Group L
  { ticker: "ENG", name: "England", flagCode: "gb-eng", group: "L", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "CRO", name: "Croatia", flagCode: "hr", group: "L", listed: true, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "GHA", name: "Ghana", flagCode: "gh", group: "L", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
  { ticker: "PAN", name: "Panama", flagCode: "pa", group: "L", listed: false, tokenAddress: null, meteoraUrl: null, axiomUrl: null },
];
