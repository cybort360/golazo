"use client";

// Client-side: permanently burn SPL tokens from the connected wallet, reducing
// the mint's on-chain total supply (the native `burn` instruction — NOT a
// transfer to a dead address, which leaves supply untouched). The connected
// wallet signs; the app never holds keys.
//
// Used by the admin "Burn Supply" panel. Defaults to $GOLAZO but works for any
// mint, so it also covers the per-match team-token buyback burns.

import type {
  Connection,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";
import { Transaction, PublicKey as Pk } from "@solana/web3.js";
import {
  getMint,
  getAssociatedTokenAddressSync,
  createBurnCheckedInstruction,
} from "@solana/spl-token";

// Convert a human-entered token amount ("1.5", "500000000") to base units for a
// mint with `decimals`. String math throughout: a burn of 500M tokens at 9
// decimals is 5e17, well past Number.MAX_SAFE_INTEGER, so float arithmetic
// (uiAmount * 10**decimals) would silently burn the wrong amount.
export function toBaseUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a positive number");
  }
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new Error(`This token has ${decimals} decimals — too many decimal places`);
  }
  const base = BigInt(whole + frac.padEnd(decimals, "0"));
  if (base <= BigInt(0)) {
    throw new Error("Amount must be greater than zero");
  }
  return base;
}

export interface BurnResult {
  signature: string;
  decimals: number;
  before: bigint; // total supply, base units, before the burn
  after: bigint; // total supply, base units, after the burn
}

export async function burnToken(params: {
  connection: Connection;
  owner: PublicKey;
  sendTransaction: (
    tx: Transaction,
    connection: Connection,
  ) => Promise<TransactionSignature>;
  mint: string;
  amount: string; // human-entered UI amount
}): Promise<BurnResult> {
  const { connection, owner, sendTransaction, mint, amount } = params;

  let mintPk: PublicKey;
  try {
    mintPk = new Pk(mint);
  } catch {
    throw new Error("That mint address isn't valid");
  }

  const info = await getMint(connection, mintPk);
  const base = toBaseUnits(amount, info.decimals);

  const fromAta = getAssociatedTokenAddressSync(mintPk, owner);

  // Guard against a wrong-wallet connect or a fat-fingered amount: the connected
  // wallet must actually hold what it's trying to burn.
  let held: bigint;
  try {
    const bal = await connection.getTokenAccountBalance(fromAta);
    held = BigInt(bal.value.amount);
  } catch {
    throw new Error("This wallet holds none of that token");
  }
  if (base > held) {
    const heldUi = Number(held) / 10 ** info.decimals;
    throw new Error(
      `You only hold ${heldUi.toLocaleString("en-US")} — can't burn more than that`,
    );
  }

  const before = BigInt((await connection.getTokenSupply(mintPk)).value.amount);

  const ix = createBurnCheckedInstruction(
    fromAta,
    mintPk,
    owner,
    base,
    info.decimals,
  );

  const tx = new Transaction().add(ix);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = owner;

  const signature = await sendTransaction(tx, connection);
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  const after = BigInt((await connection.getTokenSupply(mintPk)).value.amount);

  return { signature, decimals: info.decimals, before, after };
}
