// @vitest-environment node
import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { registerMessage, loginMessage } from "@/lib/predictAuth";
import { verifyWalletSignature } from "@/lib/verifyWalletSignature";

const kp = nacl.sign.keyPair();
const wallet = new PublicKey(kp.publicKey).toBase58();
const ts = 1_700_000_000_000;

function signedBy(message: string): string {
  return Buffer.from(
    nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey),
  ).toString("base64");
}

describe("predict auth messages", () => {
  it("register and login messages are distinct", () => {
    expect(registerMessage(wallet, ts)).not.toBe(loginMessage(wallet, ts));
  });

  it("a login signature verifies against the login message", () => {
    const sig = signedBy(loginMessage(wallet, ts));
    expect(verifyWalletSignature(wallet, loginMessage(wallet, ts), sig)).toBe(true);
  });

  it("a register signature does not satisfy a login check", () => {
    // Prevents replaying a registration signature as a sign-in (or vice-versa).
    const sig = signedBy(registerMessage(wallet, ts));
    expect(verifyWalletSignature(wallet, loginMessage(wallet, ts), sig)).toBe(false);
  });

  it("embeds the wallet and timestamp", () => {
    const msg = loginMessage(wallet, ts);
    expect(msg).toContain(wallet);
    expect(msg).toContain(new Date(ts).toISOString());
  });
});
