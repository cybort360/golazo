import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { buildMatchProof, proofForStat } from "@/lib/txline/proof";

const arr = (u: Uint8Array) => Array.from(u);

describe("golazo_predict", () => {
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

  // Binary market: market_id is a YES/NO stat key resolving to 1 (yes) / 0 (no).
  const matchId = "TESTMATCH1";
  const marketId = "home_win";
  const stats = { home_win: 1n, over25: 1n, btts: 0n };

  const marketPda = (mId: string, mkt: string) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(mId), Buffer.from(mkt)],
      program.programId,
    )[0];
  const vaultPda = (market: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), market.toBuffer()],
      program.programId,
    )[0];
  const posPda = (market: anchor.web3.PublicKey, user: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pos"), market.toBuffer(), user.toBuffer()],
      program.programId,
    )[0];

  const market = marketPda(matchId, marketId);
  const vault = vaultPda(market);
  const keeper = provider.wallet.publicKey;

  // Second staker (NO side).
  const user2 = anchor.web3.Keypair.generate();

  it("initializes the GOLAZO mint and faucets credits", async () => {
    await program.methods
      .initMint()
      .accounts({
        payer: keeper,
        mintAuthority: mintAuth,
        mint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const ata = getAssociatedTokenAddressSync(mint, keeper);
    await program.methods
      .faucet(new anchor.BN(1_000_000_000))
      .accounts({
        user: keeper,
        mint,
        mintAuthority: mintAuth,
        userAta: ata,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    const bal = await provider.connection.getTokenAccountBalance(ata);
    assert.equal(bal.value.amount, "1000000000");
  });

  it("opens a market and accepts a YES stake", async () => {
    const lock = Math.floor(Date.now() / 1000) + 3600;
    await program.methods
      .initMarket(matchId, marketId, "Will the home side win?", new anchor.BN(lock))
      .accounts({
        creator: keeper,
        mint,
        market,
        vault,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const ata = getAssociatedTokenAddressSync(mint, keeper);
    await program.methods
      .stake(1, new anchor.BN(100_000_000))
      .accounts({
        user: keeper,
        market,
        vault,
        userAta: ata,
        position: posPda(market, keeper),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const m = await program.account.market.fetch(market);
    assert.equal(m.yesTotal.toString(), "100000000");
    assert.equal(m.noTotal.toString(), "0");
  });

  it("accepts a NO stake from a second wallet", async () => {
    const sig = await provider.connection.requestAirdrop(user2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig, "confirmed");

    const ata2 = getAssociatedTokenAddressSync(mint, user2.publicKey);
    await program.methods
      .faucet(new anchor.BN(50_000_000))
      .accounts({
        user: user2.publicKey,
        mint,
        mintAuthority: mintAuth,
        userAta: ata2,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    await program.methods
      .stake(0, new anchor.BN(50_000_000))
      .accounts({
        user: user2.publicKey,
        market,
        vault,
        userAta: ata2,
        position: posPda(market, user2.publicKey),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    const m = await program.account.market.fetch(market);
    assert.equal(m.noTotal.toString(), "50000000");
  });

  it("settles YES via a real validate_stat CPI (keeper-gated)", async () => {
    const { root } = buildMatchProof(matchId, stats);
    const rootPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("root"), Buffer.from(matchId)],
      txline.programId,
    )[0];
    await txline.methods
      .postRoot(matchId, arr(root))
      .accounts({
        oracle: keeper,
        matchRoot: rootPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const { claimedValue, proof } = proofForStat(matchId, stats, marketId);
    await program.methods
      .settle(new anchor.BN(claimedValue.toString()), proof.map(arr))
      .accounts({
        keeper,
        market,
        matchRoot: rootPda,
        txlineProgram: txline.programId,
      })
      .rpc();

    const m = await program.account.market.fetch(market);
    assert.equal(m.status, 4); // ST_SETTLED
    assert.equal(m.winningSide, 1); // YES
  });

  it("pays the YES winner the whole pool and blocks the NO loser", async () => {
    const ata = getAssociatedTokenAddressSync(mint, keeper);
    const before = await provider.connection.getTokenAccountBalance(ata);
    await program.methods
      .claim()
      .accounts({
        user: keeper,
        market,
        vault,
        userAta: ata,
        position: posPda(market, keeper),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();
    const after = await provider.connection.getTokenAccountBalance(ata);
    // Pool = 150; YES staker had 100 -> receives full 150.
    assert.equal(Number(after.value.amount) - Number(before.value.amount), 150_000_000);

    const ata2 = getAssociatedTokenAddressSync(mint, user2.publicKey);
    try {
      await program.methods
        .claim()
        .accounts({
          user: user2.publicKey,
          market,
          vault,
          userAta: ata2,
          position: posPda(market, user2.publicKey),
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();
      assert.fail("loser should not be able to claim");
    } catch (e: any) {
      assert.include(e.toString(), "NotWinner");
    }
  });

  it("voids a market and refunds stakers", async () => {
    const mId = "TESTMATCH2";
    const mkt = "btts";
    const m2 = marketPda(mId, mkt);
    const v2 = vaultPda(m2);
    const lock = Math.floor(Date.now() / 1000) + 3600;
    await program.methods
      .initMarket(mId, mkt, "Both teams to score?", new anchor.BN(lock))
      .accounts({
        creator: keeper,
        mint,
        market: m2,
        vault: v2,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const ata = getAssociatedTokenAddressSync(mint, keeper);
    await program.methods
      .stake(1, new anchor.BN(20_000_000))
      .accounts({
        user: keeper,
        market: m2,
        vault: v2,
        userAta: ata,
        position: posPda(m2, keeper),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods.void().accounts({ keeper, market: m2 }).rpc();

    const before = await provider.connection.getTokenAccountBalance(ata);
    await program.methods
      .refund()
      .accounts({
        user: keeper,
        market: m2,
        vault: v2,
        userAta: ata,
        position: posPda(m2, keeper),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();
    const after = await provider.connection.getTokenAccountBalance(ata);
    assert.equal(Number(after.value.amount) - Number(before.value.amount), 20_000_000);
  });
});
