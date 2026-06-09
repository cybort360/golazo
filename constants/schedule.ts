export interface ScheduledMatch {
  id: string; // "GM001" etc
  date: string; // "2026-06-11"
  time: string; // "15:00 ET"
  groupOrRound: string; // "Group A" | "Round of 32" | "Quarterfinal" etc
  teamA: string; // ticker, or knockout placeholder e.g. "Winner Group A"
  teamB: string; // ticker, or knockout placeholder e.g. "Best 3rd (A/B/C/D/F)"
  venue: string; // city
}

// Official FIFA 2026 World Cup schedule — all 104 matches.
// Matches 1–72: group stage. 73–88: Round of 32. 89–96: Round of 16.
// 97–100: Quarterfinals. 101–102: Semifinals. 103: Third-place. 104: Final.
// Kickoff times in US Eastern Time (ET).
export const SCHEDULE: ScheduledMatch[] = [
  // ── Group stage ──────────────────────────────────────────────
  { id: "GM001", date: "2026-06-11", time: "15:00 ET", groupOrRound: "Group A", teamA: "MEX", teamB: "RSA", venue: "Mexico City" },
  { id: "GM002", date: "2026-06-11", time: "22:00 ET", groupOrRound: "Group A", teamA: "KOR", teamB: "CZE", venue: "Zapopan" },
  { id: "GM003", date: "2026-06-12", time: "15:00 ET", groupOrRound: "Group B", teamA: "CAN", teamB: "BIH", venue: "Toronto" },
  { id: "GM004", date: "2026-06-12", time: "21:00 ET", groupOrRound: "Group D", teamA: "USA", teamB: "PAR", venue: "Inglewood" },
  { id: "GM005", date: "2026-06-13", time: "15:00 ET", groupOrRound: "Group B", teamA: "QAT", teamB: "SUI", venue: "Santa Clara" },
  { id: "GM006", date: "2026-06-13", time: "18:00 ET", groupOrRound: "Group C", teamA: "BRA", teamB: "MAR", venue: "East Rutherford" },
  { id: "GM007", date: "2026-06-13", time: "21:00 ET", groupOrRound: "Group C", teamA: "HAI", teamB: "SCO", venue: "Foxborough" },
  { id: "GM008", date: "2026-06-14", time: "00:00 ET", groupOrRound: "Group D", teamA: "AUS", teamB: "TUR", venue: "Vancouver" },
  { id: "GM009", date: "2026-06-14", time: "13:00 ET", groupOrRound: "Group E", teamA: "GER", teamB: "CUW", venue: "Houston" },
  { id: "GM010", date: "2026-06-14", time: "16:00 ET", groupOrRound: "Group F", teamA: "NED", teamB: "JPN", venue: "Arlington" },
  { id: "GM011", date: "2026-06-14", time: "19:00 ET", groupOrRound: "Group E", teamA: "CIV", teamB: "ECU", venue: "Philadelphia" },
  { id: "GM012", date: "2026-06-14", time: "22:00 ET", groupOrRound: "Group F", teamA: "SWE", teamB: "TUN", venue: "Monterrey" },
  { id: "GM013", date: "2026-06-15", time: "12:00 ET", groupOrRound: "Group H", teamA: "ESP", teamB: "CPV", venue: "Atlanta" },
  { id: "GM014", date: "2026-06-15", time: "15:00 ET", groupOrRound: "Group G", teamA: "BEL", teamB: "EGY", venue: "Seattle" },
  { id: "GM015", date: "2026-06-15", time: "18:00 ET", groupOrRound: "Group H", teamA: "KSA", teamB: "URU", venue: "Miami Gardens" },
  { id: "GM016", date: "2026-06-15", time: "21:00 ET", groupOrRound: "Group G", teamA: "IRN", teamB: "NZL", venue: "Inglewood" },
  { id: "GM017", date: "2026-06-16", time: "15:00 ET", groupOrRound: "Group I", teamA: "FRA", teamB: "SEN", venue: "East Rutherford" },
  { id: "GM018", date: "2026-06-16", time: "18:00 ET", groupOrRound: "Group I", teamA: "IRQ", teamB: "NOR", venue: "Foxborough" },
  { id: "GM019", date: "2026-06-16", time: "21:00 ET", groupOrRound: "Group J", teamA: "ARG", teamB: "ALG", venue: "Kansas City" },
  { id: "GM020", date: "2026-06-17", time: "00:00 ET", groupOrRound: "Group J", teamA: "AUT", teamB: "JOR", venue: "Santa Clara" },
  { id: "GM021", date: "2026-06-17", time: "13:00 ET", groupOrRound: "Group K", teamA: "POR", teamB: "COD", venue: "Houston" },
  { id: "GM022", date: "2026-06-17", time: "16:00 ET", groupOrRound: "Group L", teamA: "ENG", teamB: "CRO", venue: "Arlington" },
  { id: "GM023", date: "2026-06-17", time: "19:00 ET", groupOrRound: "Group L", teamA: "GHA", teamB: "PAN", venue: "Toronto" },
  { id: "GM024", date: "2026-06-17", time: "22:00 ET", groupOrRound: "Group K", teamA: "UZB", teamB: "COL", venue: "Mexico City" },
  { id: "GM025", date: "2026-06-18", time: "12:00 ET", groupOrRound: "Group A", teamA: "CZE", teamB: "RSA", venue: "Atlanta" },
  { id: "GM026", date: "2026-06-18", time: "15:00 ET", groupOrRound: "Group B", teamA: "SUI", teamB: "BIH", venue: "Inglewood" },
  { id: "GM027", date: "2026-06-18", time: "18:00 ET", groupOrRound: "Group B", teamA: "CAN", teamB: "QAT", venue: "Vancouver" },
  { id: "GM028", date: "2026-06-18", time: "21:00 ET", groupOrRound: "Group A", teamA: "MEX", teamB: "KOR", venue: "Zapopan" },
  { id: "GM029", date: "2026-06-19", time: "15:00 ET", groupOrRound: "Group D", teamA: "USA", teamB: "AUS", venue: "Seattle" },
  { id: "GM030", date: "2026-06-19", time: "18:00 ET", groupOrRound: "Group C", teamA: "SCO", teamB: "MAR", venue: "Foxborough" },
  { id: "GM031", date: "2026-06-19", time: "20:30 ET", groupOrRound: "Group C", teamA: "BRA", teamB: "HAI", venue: "Philadelphia" },
  { id: "GM032", date: "2026-06-19", time: "23:00 ET", groupOrRound: "Group D", teamA: "TUR", teamB: "PAR", venue: "Santa Clara" },
  { id: "GM033", date: "2026-06-20", time: "13:00 ET", groupOrRound: "Group F", teamA: "NED", teamB: "SWE", venue: "Houston" },
  { id: "GM034", date: "2026-06-20", time: "16:00 ET", groupOrRound: "Group E", teamA: "GER", teamB: "CIV", venue: "Toronto" },
  { id: "GM035", date: "2026-06-20", time: "20:00 ET", groupOrRound: "Group E", teamA: "ECU", teamB: "CUW", venue: "Kansas City" },
  { id: "GM036", date: "2026-06-21", time: "00:00 ET", groupOrRound: "Group F", teamA: "TUN", teamB: "JPN", venue: "Monterrey" },
  { id: "GM037", date: "2026-06-21", time: "12:00 ET", groupOrRound: "Group H", teamA: "ESP", teamB: "KSA", venue: "Atlanta" },
  { id: "GM038", date: "2026-06-21", time: "15:00 ET", groupOrRound: "Group G", teamA: "BEL", teamB: "IRN", venue: "Inglewood" },
  { id: "GM039", date: "2026-06-21", time: "18:00 ET", groupOrRound: "Group H", teamA: "URU", teamB: "CPV", venue: "Miami Gardens" },
  { id: "GM040", date: "2026-06-21", time: "21:00 ET", groupOrRound: "Group G", teamA: "NZL", teamB: "EGY", venue: "Vancouver" },
  { id: "GM041", date: "2026-06-22", time: "13:00 ET", groupOrRound: "Group J", teamA: "ARG", teamB: "AUT", venue: "Arlington" },
  { id: "GM042", date: "2026-06-22", time: "17:00 ET", groupOrRound: "Group I", teamA: "FRA", teamB: "IRQ", venue: "Philadelphia" },
  { id: "GM043", date: "2026-06-22", time: "20:00 ET", groupOrRound: "Group I", teamA: "NOR", teamB: "SEN", venue: "East Rutherford" },
  { id: "GM044", date: "2026-06-22", time: "23:00 ET", groupOrRound: "Group J", teamA: "JOR", teamB: "ALG", venue: "Santa Clara" },
  { id: "GM045", date: "2026-06-23", time: "13:00 ET", groupOrRound: "Group K", teamA: "POR", teamB: "UZB", venue: "Houston" },
  { id: "GM046", date: "2026-06-23", time: "16:00 ET", groupOrRound: "Group L", teamA: "ENG", teamB: "GHA", venue: "Foxborough" },
  { id: "GM047", date: "2026-06-23", time: "19:00 ET", groupOrRound: "Group L", teamA: "PAN", teamB: "CRO", venue: "Toronto" },
  { id: "GM048", date: "2026-06-23", time: "22:00 ET", groupOrRound: "Group K", teamA: "COL", teamB: "COD", venue: "Zapopan" },
  { id: "GM049", date: "2026-06-24", time: "15:00 ET", groupOrRound: "Group B", teamA: "SUI", teamB: "CAN", venue: "Vancouver" },
  { id: "GM050", date: "2026-06-24", time: "15:00 ET", groupOrRound: "Group B", teamA: "BIH", teamB: "QAT", venue: "Seattle" },
  { id: "GM051", date: "2026-06-24", time: "18:00 ET", groupOrRound: "Group C", teamA: "SCO", teamB: "BRA", venue: "Miami Gardens" },
  { id: "GM052", date: "2026-06-24", time: "18:00 ET", groupOrRound: "Group C", teamA: "MAR", teamB: "HAI", venue: "Atlanta" },
  { id: "GM053", date: "2026-06-24", time: "21:00 ET", groupOrRound: "Group A", teamA: "CZE", teamB: "MEX", venue: "Mexico City" },
  { id: "GM054", date: "2026-06-24", time: "21:00 ET", groupOrRound: "Group A", teamA: "RSA", teamB: "KOR", venue: "Monterrey" },
  { id: "GM055", date: "2026-06-25", time: "16:00 ET", groupOrRound: "Group E", teamA: "CUW", teamB: "CIV", venue: "Philadelphia" },
  { id: "GM056", date: "2026-06-25", time: "16:00 ET", groupOrRound: "Group E", teamA: "ECU", teamB: "GER", venue: "East Rutherford" },
  { id: "GM057", date: "2026-06-25", time: "19:00 ET", groupOrRound: "Group F", teamA: "JPN", teamB: "SWE", venue: "Arlington" },
  { id: "GM058", date: "2026-06-25", time: "19:00 ET", groupOrRound: "Group F", teamA: "TUN", teamB: "NED", venue: "Kansas City" },
  { id: "GM059", date: "2026-06-25", time: "22:00 ET", groupOrRound: "Group D", teamA: "TUR", teamB: "USA", venue: "Inglewood" },
  { id: "GM060", date: "2026-06-25", time: "22:00 ET", groupOrRound: "Group D", teamA: "PAR", teamB: "AUS", venue: "Santa Clara" },
  { id: "GM061", date: "2026-06-26", time: "15:00 ET", groupOrRound: "Group I", teamA: "NOR", teamB: "FRA", venue: "Foxborough" },
  { id: "GM062", date: "2026-06-26", time: "15:00 ET", groupOrRound: "Group I", teamA: "SEN", teamB: "IRQ", venue: "Toronto" },
  { id: "GM063", date: "2026-06-26", time: "20:00 ET", groupOrRound: "Group H", teamA: "CPV", teamB: "KSA", venue: "Houston" },
  { id: "GM064", date: "2026-06-26", time: "20:00 ET", groupOrRound: "Group H", teamA: "URU", teamB: "ESP", venue: "Zapopan" },
  { id: "GM065", date: "2026-06-26", time: "23:00 ET", groupOrRound: "Group G", teamA: "EGY", teamB: "IRN", venue: "Seattle" },
  { id: "GM066", date: "2026-06-26", time: "23:00 ET", groupOrRound: "Group G", teamA: "NZL", teamB: "BEL", venue: "Vancouver" },
  { id: "GM067", date: "2026-06-27", time: "17:00 ET", groupOrRound: "Group L", teamA: "PAN", teamB: "ENG", venue: "East Rutherford" },
  { id: "GM068", date: "2026-06-27", time: "17:00 ET", groupOrRound: "Group L", teamA: "CRO", teamB: "GHA", venue: "Philadelphia" },
  { id: "GM069", date: "2026-06-27", time: "19:30 ET", groupOrRound: "Group K", teamA: "COL", teamB: "POR", venue: "Miami Gardens" },
  { id: "GM070", date: "2026-06-27", time: "19:30 ET", groupOrRound: "Group K", teamA: "COD", teamB: "UZB", venue: "Atlanta" },
  { id: "GM071", date: "2026-06-27", time: "22:00 ET", groupOrRound: "Group J", teamA: "ALG", teamB: "AUT", venue: "Kansas City" },
  { id: "GM072", date: "2026-06-27", time: "22:00 ET", groupOrRound: "Group J", teamA: "JOR", teamB: "ARG", venue: "Arlington" },

  // ── Round of 32 ──────────────────────────────────────────────
  { id: "GM073", date: "2026-06-28", time: "15:00 ET", groupOrRound: "Round of 32", teamA: "Runner-up Group A", teamB: "Runner-up Group B", venue: "Inglewood" },
  { id: "GM074", date: "2026-06-29", time: "13:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group C", teamB: "Runner-up Group F", venue: "Houston" },
  { id: "GM075", date: "2026-06-29", time: "16:30 ET", groupOrRound: "Round of 32", teamA: "Winner Group E", teamB: "Best 3rd (A/B/C/D/F)", venue: "Foxborough" },
  { id: "GM076", date: "2026-06-29", time: "21:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group F", teamB: "Runner-up Group C", venue: "Monterrey" },
  { id: "GM077", date: "2026-06-30", time: "13:00 ET", groupOrRound: "Round of 32", teamA: "Runner-up Group E", teamB: "Runner-up Group I", venue: "Arlington" },
  { id: "GM078", date: "2026-06-30", time: "17:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group I", teamB: "Best 3rd (C/D/F/G/H)", venue: "East Rutherford" },
  { id: "GM079", date: "2026-06-30", time: "21:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group A", teamB: "Best 3rd (C/E/F/H/I)", venue: "Mexico City" },
  { id: "GM080", date: "2026-07-01", time: "12:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group L", teamB: "Best 3rd (E/H/I/J/K)", venue: "Atlanta" },
  { id: "GM081", date: "2026-07-01", time: "16:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group G", teamB: "Best 3rd (A/E/H/I/J)", venue: "Seattle" },
  { id: "GM082", date: "2026-07-01", time: "20:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group D", teamB: "Best 3rd (B/E/F/I/J)", venue: "Santa Clara" },
  { id: "GM083", date: "2026-07-02", time: "15:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group H", teamB: "Runner-up Group J", venue: "Inglewood" },
  { id: "GM084", date: "2026-07-02", time: "19:00 ET", groupOrRound: "Round of 32", teamA: "Runner-up Group K", teamB: "Runner-up Group L", venue: "Toronto" },
  { id: "GM085", date: "2026-07-02", time: "23:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group B", teamB: "Best 3rd (E/F/G/I/J)", venue: "Vancouver" },
  { id: "GM086", date: "2026-07-03", time: "14:00 ET", groupOrRound: "Round of 32", teamA: "Runner-up Group D", teamB: "Runner-up Group G", venue: "Arlington" },
  { id: "GM087", date: "2026-07-03", time: "18:00 ET", groupOrRound: "Round of 32", teamA: "Winner Group J", teamB: "Runner-up Group H", venue: "Miami Gardens" },
  { id: "GM088", date: "2026-07-03", time: "21:30 ET", groupOrRound: "Round of 32", teamA: "Winner Group K", teamB: "Best 3rd (D/E/I/J/L)", venue: "Kansas City" },

  // ── Round of 16 ──────────────────────────────────────────────
  { id: "GM089", date: "2026-07-04", time: "13:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 73", teamB: "Winner Match 75", venue: "Houston" },
  { id: "GM090", date: "2026-07-04", time: "17:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 74", teamB: "Winner Match 77", venue: "Philadelphia" },
  { id: "GM091", date: "2026-07-05", time: "16:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 76", teamB: "Winner Match 78", venue: "East Rutherford" },
  { id: "GM092", date: "2026-07-05", time: "20:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 79", teamB: "Winner Match 80", venue: "Mexico City" },
  { id: "GM093", date: "2026-07-06", time: "15:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 83", teamB: "Winner Match 84", venue: "Arlington" },
  { id: "GM094", date: "2026-07-06", time: "20:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 81", teamB: "Winner Match 82", venue: "Seattle" },
  { id: "GM095", date: "2026-07-07", time: "12:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 86", teamB: "Winner Match 88", venue: "Atlanta" },
  { id: "GM096", date: "2026-07-07", time: "16:00 ET", groupOrRound: "Round of 16", teamA: "Winner Match 85", teamB: "Winner Match 87", venue: "Vancouver" },

  // ── Quarterfinals ────────────────────────────────────────────
  { id: "GM097", date: "2026-07-09", time: "16:00 ET", groupOrRound: "Quarterfinal", teamA: "Winner Match 89", teamB: "Winner Match 90", venue: "Foxborough" },
  { id: "GM098", date: "2026-07-10", time: "15:00 ET", groupOrRound: "Quarterfinal", teamA: "Winner Match 93", teamB: "Winner Match 94", venue: "Inglewood" },
  { id: "GM099", date: "2026-07-11", time: "17:00 ET", groupOrRound: "Quarterfinal", teamA: "Winner Match 91", teamB: "Winner Match 92", venue: "Miami Gardens" },
  { id: "GM100", date: "2026-07-11", time: "21:00 ET", groupOrRound: "Quarterfinal", teamA: "Winner Match 95", teamB: "Winner Match 96", venue: "Kansas City" },

  // ── Semifinals ───────────────────────────────────────────────
  { id: "GM101", date: "2026-07-14", time: "15:00 ET", groupOrRound: "Semifinal", teamA: "Winner Match 97", teamB: "Winner Match 98", venue: "Arlington" },
  { id: "GM102", date: "2026-07-15", time: "15:00 ET", groupOrRound: "Semifinal", teamA: "Winner Match 99", teamB: "Winner Match 100", venue: "Atlanta" },

  // ── Third-place playoff ──────────────────────────────────────
  { id: "GM103", date: "2026-07-18", time: "17:00 ET", groupOrRound: "Third-Place Match", teamA: "Loser Match 101", teamB: "Loser Match 102", venue: "Miami Gardens" },

  // ── Final ────────────────────────────────────────────────────
  { id: "GM104", date: "2026-07-19", time: "15:00 ET", groupOrRound: "Final", teamA: "Winner Match 101", teamB: "Winner Match 102", venue: "East Rutherford" },
];
