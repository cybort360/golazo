/**
 * Post-deploy devnet setup. Run AFTER `anchor deploy --provider.cluster devnet`:
 *
 *   cd anchor && npx ts-node -r tsconfig-paths/register scripts/setup-devnet.ts
 *
 * It (1) initializes the GOLAZO mint (idempotent), (2) posts a demo Merkle root
 * for one match into txline_mock, and (3) prints the NEXT_PUBLIC_* env lines to
 * paste into ../.env.local. No real money — devnet demo credits only.
 */
import * as anchor from "@coral-xyz/anchor";
import { buildMatchProof } from "@/lib/txline/proof";

const DEMO_MATCH = "ABLRVR";
const DEMO_STATS = { home_win: 1n, over25: 1n, btts: 0n };

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GolazoPredict as anchor.Program;
  const txline = anchor.workspace.TxlineMock as anchor.Program;

  const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("golazo_mint")],
    program.programId,
  );
  const [mintAuth] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint_auth")],
    program.programId,
  );

  // 1. init mint (skip if already created)
  const existing = await provider.connection.getAccountInfo(mint);
  if (!existing) {
    await program.methods
      .initMint()
      .accounts({
        payer: provider.wallet.publicKey,
        mintAuthority: mintAuth,
        mint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("✓ GOLAZO mint initialized");
  } else {
    console.log("• GOLAZO mint already exists");
  }

  // 2. post demo Merkle root
  const { root } = buildMatchProof(DEMO_MATCH, DEMO_STATS);
  const [rootPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("root"), Buffer.from(DEMO_MATCH)],
    txline.programId,
  );
  await txline.methods
    .postRoot(DEMO_MATCH, Array.from(root))
    .accounts({
      oracle: provider.wallet.publicKey,
      matchRoot: rootPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  console.log(`✓ posted demo root for match ${DEMO_MATCH}`);

  console.log("\n# Paste into ../.env.local:");
  console.log(`NEXT_PUBLIC_TXLINE_MOCK_PROGRAM=${txline.programId.toBase58()}`);
  console.log(`NEXT_PUBLIC_GOLAZO_PREDICT_PROGRAM=${program.programId.toBase58()}`);
  console.log(`NEXT_PUBLIC_GOLAZO_MINT=${mint.toBase58()}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
