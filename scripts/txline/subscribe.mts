/**
 * TxLINE devnet subscribe — free World Cup 2026 tier.
 *
 * Runs the full access bootstrap with YOUR wallet:
 *   1. guest JWT   (POST /auth/guest/start)
 *   2. on-chain    subscribe(serviceLevelId, weeks)  ← your wallet signs + pays devnet SOL
 *   3. activate    (POST /api/token/activate, signed message)
 * then prints the env block for .env.local.
 *
 * Run:
 *   npx tsx scripts/txline/subscribe.mts
 *
 * Env (all optional, sensible devnet defaults):
 *   SOLANA_KEYPAIR        path to a funded DEVNET keypair (default ~/.config/solana/id.json)
 *   TXLINE_RPC            devnet RPC (default https://api.devnet.solana.com)
 *   TXLINE_HOST           default https://txline-dev.txodds.com
 *   TXLINE_SERVICE_LEVEL  12 = real-time free WC (default) | 1 = 60s-delayed free
 *   TXLINE_WEEKS          subscription weeks, multiple of 4 (default 4)
 *
 * NOTE: this performs a real devnet transaction. The free tier transfers 0 TxL
 * but you still pay ~0.000005 SOL in network fees, so the wallet needs a little
 * devnet SOL (`solana airdrop 1 -u devnet <pubkey>`).
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createPrivateKey, sign as edSign } from "node:crypto";
import axios from "axios";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// ---- devnet constants (docs/programs/addresses) ----------------------------
const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const TXL_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");

const HOST = process.env.TXLINE_HOST ?? "https://txline-dev.txodds.com";
const RPC = process.env.TXLINE_RPC ?? "https://api.devnet.solana.com";
// Devnet's pricing matrix exposes one tier: rowId 1 (free, real-time, WC bundle).
// Mainnet uses 1 (60s delay) / 12 (real-time). Override via env if needed.
const SERVICE_LEVEL = Number(process.env.TXLINE_SERVICE_LEVEL ?? "1");
const WEEKS = Number(process.env.TXLINE_WEEKS ?? "4");
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR ?? `${homedir()}/.config/solana/id.json`;
const LEAGUES: string[] = []; // empty = standard free World Cup bundle

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// Detached ed25519 signature over a utf8 message, using the keypair seed.
// Avoids a tweetnacl dependency by wrapping the 32-byte seed as PKCS8.
function signMessage(message: string, kp: Keypair): string {
  const seed = Buffer.from(kp.secretKey.slice(0, 32));
  const pkcs8 = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
  const key = createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
  return edSign(null, Buffer.from(message, "utf8"), key).toString("base64");
}

async function main() {
  const kp = loadKeypair(KEYPAIR_PATH);
  console.log(`Wallet:   ${kp.publicKey.toBase58()}`);
  console.log(`Host:     ${HOST}`);
  console.log(`Service:  ${SERVICE_LEVEL} (12=real-time, 1=60s delay)  weeks=${WEEKS}\n`);

  const connection = new Connection(RPC, "confirmed");
  const bal = await connection.getBalance(kp.publicKey);
  console.log(`Devnet SOL balance: ${bal / 1e9}`);
  if (bal === 0) throw new Error(`Wallet has 0 devnet SOL. Run: solana airdrop 1 -u devnet ${kp.publicKey.toBase58()}`);

  // 1) guest JWT
  const { data: guest } = await axios.post(`${HOST}/auth/guest/start`);
  const jwt: string = guest.token ?? guest.jwt;
  if (!jwt) throw new Error(`No JWT in /auth/guest/start response: ${JSON.stringify(guest)}`);
  console.log("✓ guest JWT acquired");

  // 2) on-chain subscribe
  const wallet = new anchor.Wallet(kp);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
  if (!idl) throw new Error("Could not fetch on-chain IDL for the TxLINE program. Check RPC/program id.");
  const program = new anchor.Program(idl as anchor.Idl, provider);

  // Show what the IDL's `subscribe` expects, so account wiring is verifiable.
  const ix = (idl as any).instructions?.find((i: any) => i.name === "subscribe");
  console.log("subscribe accounts (from IDL):", ix?.accounts?.map((a: any) => a.name).join(", "));

  // TxL is a Token-2022 mint, so ATAs derive + create under TOKEN_2022_PROGRAM_ID.
  const [pricingMatrix] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], PROGRAM_ID);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], PROGRAM_ID);
  const userTokenAccount = getAssociatedTokenAddressSync(TXL_MINT, kp.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const tokenTreasuryVault = getAssociatedTokenAddressSync(TXL_MINT, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);

  const preIx = createAssociatedTokenAccountIdempotentInstruction(
    kp.publicKey,
    userTokenAccount,
    kp.publicKey,
    TXL_MINT,
    TOKEN_2022_PROGRAM_ID,
  );

  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL, WEEKS)
    .accounts({
      user: kp.publicKey,
      pricingMatrix,
      tokenMint: TXL_MINT,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .preInstructions([preIx])
    .rpc();
  console.log(`✓ subscribed on-chain. txSig=${txSig}`);

  // 3) activate API token
  const message = `${txSig}:${LEAGUES.join(",")}:${jwt}`;
  const walletSignature = signMessage(message, kp);
  const { data: act } = await axios.post(
    `${HOST}/api/token/activate`,
    { txSig, walletSignature, leagues: LEAGUES },
    { headers: { Authorization: `Bearer ${jwt}` } },
  );
  // activate returns the token as a bare string (or, defensively, an object).
  const apiToken: string = typeof act === "string" ? act : act.apiToken ?? act.token ?? act.api_token;
  if (!apiToken) {
    console.log("activate response:", JSON.stringify(act, null, 2));
    throw new Error("No API token found in activate response (see above).");
  }

  console.log("\n✅ Done. Paste into .env.local:\n");
  console.log(`TXLINE_MODE=live`);
  console.log(`TXLINE_API_BASE=${HOST}`);
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_TOKEN=${apiToken}`);
}

main().catch((e) => {
  console.error("\n✗ subscribe failed:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
