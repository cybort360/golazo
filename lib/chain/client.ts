"use client";
import { useMemo } from "react";
import { AnchorProvider, Program, BN, type Idl } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, type Connection } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import golazoIdl from "@/lib/chain/idl/golazo_predict.json";
import { GOLAZO_MINT } from "@/lib/chain/constants";
import { mintAuthorityPda, marketPda, vaultPda, positionPda } from "@/lib/chain/pdas";

// Loosely-typed Program — the IDL JSON carries the address + instructions.
export type GolazoProgram = Program<Idl>;

/** Build an Anchor program bound to the connected wallet (client-only). */
export function useGolazoProgram(): GolazoProgram | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new Program(golazoIdl as Idl, provider) as GolazoProgram;
  }, [connection, wallet]);
}

export async function getGolazoBalance(connection: Connection, owner: PublicKey): Promise<bigint> {
  const ata = getAssociatedTokenAddressSync(GOLAZO_MINT, owner);
  try {
    const bal = await connection.getTokenAccountBalance(ata);
    return BigInt(bal.value.amount);
  } catch {
    return 0n; // ATA not created yet
  }
}

export async function faucet(program: GolazoProgram, owner: PublicKey, amount: bigint) {
  const userAta = getAssociatedTokenAddressSync(GOLAZO_MINT, owner);
  return program.methods
    .faucet(new BN(amount.toString()))
    .accounts({
      user: owner,
      mint: GOLAZO_MINT,
      mintAuthority: mintAuthorityPda(),
      userAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    })
    .rpc();
}

export async function stake(
  program: GolazoProgram,
  owner: PublicKey,
  matchId: string,
  marketId: string,
  side: 0 | 1,
  amount: bigint,
) {
  const market = marketPda(matchId, marketId);
  return program.methods
    .stake(side, new BN(amount.toString()))
    .accounts({
      user: owner,
      market,
      vault: vaultPda(market),
      userAta: getAssociatedTokenAddressSync(GOLAZO_MINT, owner),
      position: positionPda(market, owner),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    })
    .rpc();
}

export async function claim(
  program: GolazoProgram,
  owner: PublicKey,
  matchId: string,
  marketId: string,
  kind: "claim" | "refund" = "claim",
) {
  const market = marketPda(matchId, marketId);
  const accounts = {
    user: owner,
    market,
    vault: vaultPda(market),
    userAta: getAssociatedTokenAddressSync(GOLAZO_MINT, owner),
    position: positionPda(market, owner),
    tokenProgram: TOKEN_PROGRAM_ID,
  };
  return kind === "refund"
    ? program.methods.refund().accounts(accounts).rpc()
    : program.methods.claim().accounts(accounts).rpc();
}

export interface MarketState {
  matchId: string;
  marketId: string;
  question: string;
  status: number;
  winningSide: number;
  lockTs: number;
  yesTotal: bigint;
  noTotal: bigint;
}

export async function fetchMarket(
  program: GolazoProgram,
  matchId: string,
  marketId: string,
): Promise<MarketState | null> {
  try {
    const m: any = await (program.account as any).market.fetch(marketPda(matchId, marketId));
    return {
      matchId: m.matchId,
      marketId: m.marketId,
      question: m.question,
      status: m.status,
      winningSide: m.winningSide,
      lockTs: Number(m.lockTs),
      yesTotal: BigInt(m.yesTotal.toString()),
      noTotal: BigInt(m.noTotal.toString()),
    };
  } catch {
    return null; // market not created on-chain yet
  }
}
