// Launch checklist for the listed Golazo tokens (GOLAZO + the 24 teams that
// get a market). Unlisted teams have no token, so they're skipped here.
// Run with: npx tsx scripts/launch-tokens.ts

import { TEAMS } from "../constants/teams";

const METEORA_CREATE_URL = "https://launch.meteora.ag";
const BLANK = "________________";

interface Entry {
  symbol: string;
  parenthetical: string; // shown after the symbol on the header line
  name: string;
  description: string;
  image: string;
}

function printEntry(index: number, e: Entry): void {
  console.log(`[ ] ${index}. $${e.symbol} (${e.parenthetical})`);
  console.log(`    Name: ${e.name}`);
  console.log(`    Symbol: ${e.symbol}`);
  console.log(`    Description: ${e.description}`);
  console.log(`    Image: ${e.image}`);
  console.log(`    Meteora URL: ${METEORA_CREATE_URL}`);
  console.log(`    After launch, paste address here: ${BLANK}`);
  console.log("");
}

function main(): void {
  console.log("GOLAZO TOKEN LAUNCH CHECKLIST");
  console.log("==============================");
  console.log("");

  let index = 1;

  // 1. Platform token.
  printEntry(index++, {
    symbol: "GOLAZO",
    parenthetical: "Platform Token",
    name: "Golazo",
    description:
      "The official Golazo platform token. Holders earn from every tournament forever.",
    image: "Upload golazo logo",
  });

  // Team tokens, grouped by group stage. Only the listed teams get a market.
  let currentGroup = "";
  for (const team of TEAMS.filter((t) => t.listed !== false)) {
    if (team.group !== currentGroup) {
      currentGroup = team.group;
      console.log(`--- GROUP ${currentGroup} ---`);
      console.log("");
    }
    printEntry(index++, {
      symbol: team.ticker,
      parenthetical: team.name,
      name: team.name,
      description: `Trade the ${team.name} World Cup 2026 token. Champion holders split the prize pool.`,
      image: `${team.name} flag`,
    });
  }

  const total = index - 1;

  console.log("SUMMARY");
  console.log("=======");
  console.log(`Total tokens to launch: ${total}`);
  console.log(
    `Estimated SOL needed: pool creation cost × ${total}, plus seed liquidity per pool (see Meteora launch docs)`,
  );
  console.log(
    "Recommended launch order: $GOLAZO first, then Group A, B, C...",
  );
}

main();
