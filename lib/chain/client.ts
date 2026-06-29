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
import txlineIdl from "@/lib/chain/idl/txline_mock.json";
import { GOLAZO_MINT, TXLINE_MOCK_PROGRAM } from "@/lib/chain/constants";
import { mintAuthorityPda, marketPda, vaultPda, positionPda, matchRootPda } from "@/lib/chain/pdas";
import { buildMatchProof, proofForStat } from "@/lib/txline/proof";

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

/** The txline_mock program bound to the connected wallet (oracle/keeper). */
export function useTxlineProgram(): GolazoProgram | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new Program(txlineIdl as Idl, provider) as GolazoProgram;
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

/** Open a YES/NO market on-chain. The caller becomes the keeper. */
export async function initMarket(
  program: GolazoProgram,
  owner: PublicKey,
  matchId: string,
  marketId: string,
  question: string,
  lockTsSeconds: number,
) {
  const market = marketPda(matchId, marketId);
  return program.methods
    .initMarket(matchId, marketId, question, new BN(lockTsSeconds))
    .accounts({
      creator: owner,
      mint: GOLAZO_MINT,
      market,
      vault: vaultPda(market),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
      rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
    })
    .rpc();
}

/**
 * Keeper settlement: post the match Merkle root (idempotent) into txline_mock,
 * then settle the market via the real validate_stat CPI. `stats` are the binary
 * (0/1) resolutions keyed by market_id, as returned by the TxLINE adapter.
 */
export async function settleMarket(
  golazo: GolazoProgram,
  txline: GolazoProgram,
  owner: PublicKey,
  matchId: string,
  marketId: string,
  stats: Record<string, 0 | 1>,
) {
  const bigStats: Record<string, bigint> = Object.fromEntries(
    Object.entries(stats).map(([k, v]) => [k, BigInt(v)]),
  );
  const { root } = buildMatchProof(matchId, bigStats);
  const rootPda = matchRootPda(matchId);

  const existing = await txline.provider.connection.getAccountInfo(rootPda);
  if (!existing) {
    await txline.methods
      .postRoot(matchId, Array.from(root))
      .accounts({
        oracle: owner,
        matchRoot: rootPda,
        systemProgram: PublicKey.default,
      })
      .rpc();
  }

  const { claimedValue, proof } = proofForStat(matchId, bigStats, marketId);
  return golazo.methods
    .settle(new BN(claimedValue.toString()), proof.map((p) => Array.from(p)))
    .accounts({
      keeper: owner,
      market: marketPda(matchId, marketId),
      matchRoot: rootPda,
      txlineProgram: TXLINE_MOCK_PROGRAM,
    })
    .rpc();
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
