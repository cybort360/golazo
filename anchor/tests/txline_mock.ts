import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { buildMatchProof, proofForStat, STAT_KEYS } from "@/lib/txline/proof";

describe("txline_mock", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TxlineMock as anchor.Program;

  const matchId = "ABLRVR";
  const stats = {
    [STAT_KEYS.winner]: 0n,
    [STAT_KEYS.totals]: 1n,
    [STAT_KEYS.btts]: 1n,
    [STAT_KEYS.chaos]: 0n,
  };

  const arr = (u: Uint8Array) => Array.from(u);
  const rootPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("root"), Buffer.from(matchId)],
    program.programId,
  )[0];

  it("posts a root and validates a correct stat proof", async () => {
    const { root } = buildMatchProof(matchId, stats);
    await program.methods
      .postRoot(matchId, arr(root))
      .accounts({
        oracle: provider.wallet.publicKey,
        matchRoot: rootPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const { claimedValue, proof } = proofForStat(matchId, stats, STAT_KEYS.winner);
    await program.methods
      .validateStat(matchId, STAT_KEYS.winner, new anchor.BN(claimedValue.toString()), proof.map(arr))
      .accounts({ matchRoot: rootPda })
      .rpc();
  });

  it("rejects a tampered claimed value", async () => {
    const { proof } = proofForStat(matchId, stats, STAT_KEYS.winner);
    try {
      await program.methods
        .validateStat(matchId, STAT_KEYS.winner, new anchor.BN(2), proof.map(arr))
        .accounts({ matchRoot: rootPda })
        .rpc();
      assert.fail("should have thrown");
    } catch (e: any) {
      assert.include(e.toString(), "InvalidProof");
    }
  });
});
