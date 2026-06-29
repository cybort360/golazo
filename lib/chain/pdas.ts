import { PublicKey } from "@solana/web3.js";
import { GOLAZO_PREDICT_PROGRAM, TXLINE_MOCK_PROGRAM } from "@/lib/chain/constants";

export function mintAuthorityPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("mint_auth")], GOLAZO_PREDICT_PROGRAM)[0];
}

export function marketPda(matchId: string, marketId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from(matchId), Buffer.from(marketId)],
    GOLAZO_PREDICT_PROGRAM,
  )[0];
}

export function vaultPda(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), market.toBuffer()],
    GOLAZO_PREDICT_PROGRAM,
  )[0];
}

export function positionPda(market: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pos"), market.toBuffer(), user.toBuffer()],
    GOLAZO_PREDICT_PROGRAM,
  )[0];
}

export function matchRootPda(matchId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("root"), Buffer.from(matchId)],
    TXLINE_MOCK_PROGRAM,
  )[0];
}
