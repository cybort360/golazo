"use client";

// Client-side: build, send, and confirm a $GOLAZO entry-fee transfer to the
// league treasury, returning the transaction signature for the server to verify.
// The connected wallet signs the transfer — the app never holds keys. The
// treasury's $GOLAZO associated-token account must already exist.
//
// ⚠ Not runtime-tested: $GOLAZO isn't launched yet, so there's no mint/treasury
// to send to. Verify on mainnet with a small transfer before relying on it.

import type { Connection, PublicKey, TransactionSignature } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { PublicKey as Pk } from "@solana/web3.js";
import {
  getMint,
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
} from "@solana/spl-token";

export async function payGolazoEntry(params: {
  connection: Connection;
  owner: PublicKey;
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<TransactionSignature>;
  mint: string;
  treasury: string;
  uiAmount: number;
}): Promise<string> {
  const { connection, owner, sendTransaction, mint, treasury, uiAmount } = params;
  const mintPk = new Pk(mint);
  const treasuryPk = new Pk(treasury);

  const info = await getMint(connection, mintPk);
  const amount = BigInt(Math.round(uiAmount * 10 ** info.decimals));

  const fromAta = getAssociatedTokenAddressSync(mintPk, owner);
  const toAta = getAssociatedTokenAddressSync(mintPk, treasuryPk);

  const ix = createTransferCheckedInstruction(
    fromAta,
    mintPk,
    toAta,
    owner,
    amount,
    info.decimals,
  );

  const tx = new Transaction().add(ix);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = owner;

  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}
