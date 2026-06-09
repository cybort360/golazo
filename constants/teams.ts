export interface Team {
  ticker: string; // e.g. "BRA"
  name: string; // e.g. "Brazil"
  flagCode: string; // flag-icons code, e.g. "br" (or "gb-eng" / "gb-sct")
  group: string; // "A" through "L"
  tokenAddress: string | null; // pump.fun token address, null until launched
  pumpUrl: string | null; // pump.fun token page URL
  axiomUrl: string | null; // axiom.trade token page URL
}

// Official 2026 FIFA World Cup final draw (Washington, D.C., December 5, 2025).
// 48 teams, 12 groups (A–L), 4 teams per group.
export const TEAMS: Team[] = [
  // Group A
  { ticker: "MEX", name: "Mexico", flagCode: "mx", group: "A", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "RSA", name: "South Africa", flagCode: "za", group: "A", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "KOR", name: "South Korea", flagCode: "kr", group: "A", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "CZE", name: "Czechia", flagCode: "cz", group: "A", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group B
  { ticker: "CAN", name: "Canada", flagCode: "ca", group: "B", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "BIH", name: "Bosnia and Herzegovina", flagCode: "ba", group: "B", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "QAT", name: "Qatar", flagCode: "qa", group: "B", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "SUI", name: "Switzerland", flagCode: "ch", group: "B", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group C
  { ticker: "BRA", name: "Brazil", flagCode: "br", group: "C", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "MAR", name: "Morocco", flagCode: "ma", group: "C", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "HAI", name: "Haiti", flagCode: "ht", group: "C", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "SCO", name: "Scotland", flagCode: "gb-sct", group: "C", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group D
  { ticker: "USA", name: "United States", flagCode: "us", group: "D", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "PAR", name: "Paraguay", flagCode: "py", group: "D", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "AUS", name: "Australia", flagCode: "au", group: "D", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "TUR", name: "Türkiye", flagCode: "tr", group: "D", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group E
  { ticker: "GER", name: "Germany", flagCode: "de", group: "E", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "CUW", name: "Curaçao", flagCode: "cw", group: "E", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "CIV", name: "Ivory Coast", flagCode: "ci", group: "E", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "ECU", name: "Ecuador", flagCode: "ec", group: "E", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group F
  { ticker: "NED", name: "Netherlands", flagCode: "nl", group: "F", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "JPN", name: "Japan", flagCode: "jp", group: "F", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "SWE", name: "Sweden", flagCode: "se", group: "F", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "TUN", name: "Tunisia", flagCode: "tn", group: "F", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group G
  { ticker: "BEL", name: "Belgium", flagCode: "be", group: "G", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "EGY", name: "Egypt", flagCode: "eg", group: "G", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "IRN", name: "Iran", flagCode: "ir", group: "G", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "NZL", name: "New Zealand", flagCode: "nz", group: "G", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group H
  { ticker: "ESP", name: "Spain", flagCode: "es", group: "H", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "CPV", name: "Cape Verde", flagCode: "cv", group: "H", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "KSA", name: "Saudi Arabia", flagCode: "sa", group: "H", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "URU", name: "Uruguay", flagCode: "uy", group: "H", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group I
  { ticker: "FRA", name: "France", flagCode: "fr", group: "I", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "SEN", name: "Senegal", flagCode: "sn", group: "I", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "IRQ", name: "Iraq", flagCode: "iq", group: "I", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "NOR", name: "Norway", flagCode: "no", group: "I", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group J
  { ticker: "ARG", name: "Argentina", flagCode: "ar", group: "J", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "ALG", name: "Algeria", flagCode: "dz", group: "J", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "AUT", name: "Austria", flagCode: "at", group: "J", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "JOR", name: "Jordan", flagCode: "jo", group: "J", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group K
  { ticker: "POR", name: "Portugal", flagCode: "pt", group: "K", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "COD", name: "DR Congo", flagCode: "cd", group: "K", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "UZB", name: "Uzbekistan", flagCode: "uz", group: "K", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "COL", name: "Colombia", flagCode: "co", group: "K", tokenAddress: null, pumpUrl: null, axiomUrl: null },

  // Group L
  { ticker: "ENG", name: "England", flagCode: "gb-eng", group: "L", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "CRO", name: "Croatia", flagCode: "hr", group: "L", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "GHA", name: "Ghana", flagCode: "gh", group: "L", tokenAddress: null, pumpUrl: null, axiomUrl: null },
  { ticker: "PAN", name: "Panama", flagCode: "pa", group: "L", tokenAddress: null, pumpUrl: null, axiomUrl: null },
];
