// Server-side ed25519 signature check: proves the signer controls the Solana
// wallet they're registering. Never throws — returns false on any malformed
// input. (Server-only: pulls in tweetnacl + web3.js, so don't import from the
// client.)

import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export function verifyWalletSignature(
  wallet: string,
  message: string,
  signatureBase64: string,
): boolean {
  try {
    const pub = new PublicKey(wallet).toBytes();
    const msg = new TextEncoder().encode(message);
    const sig = Uint8Array.from(Buffer.from(signatureBase64, "base64"));
    if (sig.length !== 64) return false;
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}
