export interface Team {
  ticker: string; // e.g. "BRA"
  name: string; // e.g. "Brazil"
  flagCode: string; // flag-icons code, e.g. "br" (or "gb-eng" / "gb-sct")
  group: string; // "A" through "L"
}

// Official 2026 FIFA World Cup final draw (Washington, D.C., December 5, 2025).
// 48 teams, 12 groups (A–L), 4 teams per group.
export const TEAMS: Team[] = [
  // Group A
  { ticker: "MEX", name: "Mexico", flagCode: "mx", group: "A" },
  { ticker: "RSA", name: "South Africa", flagCode: "za", group: "A" },
  { ticker: "KOR", name: "South Korea", flagCode: "kr", group: "A" },
  { ticker: "CZE", name: "Czechia", flagCode: "cz", group: "A" },

  // Group B
  { ticker: "CAN", name: "Canada", flagCode: "ca", group: "B" },
  { ticker: "BIH", name: "Bosnia and Herzegovina", flagCode: "ba", group: "B" },
  { ticker: "QAT", name: "Qatar", flagCode: "qa", group: "B" },
  { ticker: "SUI", name: "Switzerland", flagCode: "ch", group: "B" },

  // Group C
  { ticker: "BRA", name: "Brazil", flagCode: "br", group: "C" },
  { ticker: "MAR", name: "Morocco", flagCode: "ma", group: "C" },
  { ticker: "HAI", name: "Haiti", flagCode: "ht", group: "C" },
  { ticker: "SCO", name: "Scotland", flagCode: "gb-sct", group: "C" },

  // Group D
  { ticker: "USA", name: "United States", flagCode: "us", group: "D" },
  { ticker: "PAR", name: "Paraguay", flagCode: "py", group: "D" },
  { ticker: "AUS", name: "Australia", flagCode: "au", group: "D" },
  { ticker: "TUR", name: "Türkiye", flagCode: "tr", group: "D" },

  // Group E
  { ticker: "GER", name: "Germany", flagCode: "de", group: "E" },
  { ticker: "CUW", name: "Curaçao", flagCode: "cw", group: "E" },
  { ticker: "CIV", name: "Ivory Coast", flagCode: "ci", group: "E" },
  { ticker: "ECU", name: "Ecuador", flagCode: "ec", group: "E" },

  // Group F
  { ticker: "NED", name: "Netherlands", flagCode: "nl", group: "F" },
  { ticker: "JPN", name: "Japan", flagCode: "jp", group: "F" },
  { ticker: "SWE", name: "Sweden", flagCode: "se", group: "F" },
  { ticker: "TUN", name: "Tunisia", flagCode: "tn", group: "F" },

  // Group G
  { ticker: "BEL", name: "Belgium", flagCode: "be", group: "G" },
  { ticker: "EGY", name: "Egypt", flagCode: "eg", group: "G" },
  { ticker: "IRN", name: "Iran", flagCode: "ir", group: "G" },
  { ticker: "NZL", name: "New Zealand", flagCode: "nz", group: "G" },

  // Group H
  { ticker: "ESP", name: "Spain", flagCode: "es", group: "H" },
  { ticker: "CPV", name: "Cape Verde", flagCode: "cv", group: "H" },
  { ticker: "KSA", name: "Saudi Arabia", flagCode: "sa", group: "H" },
  { ticker: "URU", name: "Uruguay", flagCode: "uy", group: "H" },

  // Group I
  { ticker: "FRA", name: "France", flagCode: "fr", group: "I" },
  { ticker: "SEN", name: "Senegal", flagCode: "sn", group: "I" },
  { ticker: "IRQ", name: "Iraq", flagCode: "iq", group: "I" },
  { ticker: "NOR", name: "Norway", flagCode: "no", group: "I" },

  // Group J
  { ticker: "ARG", name: "Argentina", flagCode: "ar", group: "J" },
  { ticker: "ALG", name: "Algeria", flagCode: "dz", group: "J" },
  { ticker: "AUT", name: "Austria", flagCode: "at", group: "J" },
  { ticker: "JOR", name: "Jordan", flagCode: "jo", group: "J" },

  // Group K
  { ticker: "POR", name: "Portugal", flagCode: "pt", group: "K" },
  { ticker: "COD", name: "DR Congo", flagCode: "cd", group: "K" },
  { ticker: "UZB", name: "Uzbekistan", flagCode: "uz", group: "K" },
  { ticker: "COL", name: "Colombia", flagCode: "co", group: "K" },

  // Group L
  { ticker: "ENG", name: "England", flagCode: "gb-eng", group: "L" },
  { ticker: "CRO", name: "Croatia", flagCode: "hr", group: "L" },
  { ticker: "GHA", name: "Ghana", flagCode: "gh", group: "L" },
  { ticker: "PAN", name: "Panama", flagCode: "pa", group: "L" },
];
