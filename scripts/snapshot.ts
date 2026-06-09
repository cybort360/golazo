// Champion token holder snapshot for airdrop distribution.
// Usage:
//   CHAMPION_MINT=<address> PRIZE_POOL_SOL=<amount> npx ts-node scripts/snapshot.ts
// Requires HELIUS_API_KEY in the environment. Optionally reads
// NEXT_PUBLIC_PRIZE_POOL_WALLET and NEXT_PUBLIC_BUYBACK_WALLET to exclude them.

import { writeFileSync } from "fs";
import { getTokenHolders } from "../lib/helius";

interface Row {
  rank: number;
  wallet: string;
  tokens: number;
  share: number; // 0..1
  airdrop: number; // SOL
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const mint = process.env.CHAMPION_MINT;
  const prizeRaw = process.env.PRIZE_POOL_SOL;

  if (!mint || !prizeRaw) {
    fail(
      "Usage: CHAMPION_MINT=<address> PRIZE_POOL_SOL=<amount> npx ts-node scripts/snapshot.ts",
    );
  }

  const prizePoolSol = Number.parseFloat(prizeRaw);
  if (!Number.isFinite(prizePoolSol) || prizePoolSol <= 0) {
    fail("PRIZE_POOL_SOL must be a positive number.");
  }

  if (!process.env.HELIUS_API_KEY) {
    console.warn(
      "Warning: HELIUS_API_KEY is not set — the snapshot will likely be empty.",
    );
  }

  // Step 3 — wallets to exclude from the distribution.
  const excluded = new Set(
    [
      process.env.NEXT_PUBLIC_PRIZE_POOL_WALLET,
      process.env.NEXT_PUBLIC_BUYBACK_WALLET,
    ].filter((a): a is string => typeof a === "string" && a.length > 0),
  );

  console.log(`Fetching holders for ${mint} …`);
  const allHolders = await getTokenHolders(mint);
  const holders = allHolders.filter((h) => !excluded.has(h.address));

  if (holders.length === 0) {
    fail(
      "No eligible holders found. Check CHAMPION_MINT and HELIUS_API_KEY (and that the token has holders).",
    );
  }

  // Step 4 — proportional share of the prize pool among eligible holders.
  const totalSupply = holders.reduce((sum, h) => sum + h.uiAmount, 0);
  const rows: Row[] = holders.map((h, i) => {
    const share = totalSupply > 0 ? h.uiAmount / totalSupply : 0;
    return {
      rank: i + 1,
      wallet: h.address,
      tokens: h.uiAmount,
      share,
      airdrop: share * prizePoolSol,
    };
  });

  // Step 5 — sorted table.
  console.log("");
  console.log(
    `${"Rank".padEnd(5)}${"Wallet".padEnd(46)}${"Tokens".padStart(18)}${"% Share".padStart(10)}${"SOL Airdrop".padStart(14)}`,
  );
  console.log("-".repeat(93));
  for (const r of rows) {
    console.log(
      `${String(r.rank).padEnd(5)}${r.wallet.padEnd(46)}${r.tokens
        .toLocaleString("en-US", { maximumFractionDigits: 2 })
        .padStart(18)}${`${(r.share * 100).toFixed(4)}%`.padStart(10)}${r.airdrop
        .toFixed(6)
        .padStart(14)}`,
    );
  }

  // Step 6 — write CSV.
  const date = new Date().toISOString().slice(0, 10);
  const filename = `snapshot_${date}.csv`;
  const csv = [
    "Rank,Wallet,Tokens,Share,SOL Airdrop",
    ...rows.map(
      (r) =>
        `${r.rank},${r.wallet},${r.tokens},${(r.share * 100).toFixed(6)}%,${r.airdrop.toFixed(9)}`,
    ),
  ].join("\n");
  writeFileSync(filename, csv);

  // Step 7 — total.
  const totalSol = rows.reduce((sum, r) => sum + r.airdrop, 0);
  console.log("");
  console.log(`Saved ${filename}`);
  console.log(
    `${rows.length} holders will receive ${totalSol.toFixed(4)} SOL total`,
  );
}

main().catch((err) => {
  console.error("Snapshot failed:", err);
  process.exit(1);
});
