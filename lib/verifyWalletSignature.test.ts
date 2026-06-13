// @vitest-environment node
import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { verifyWalletSignature } from "@/lib/verifyWalletSignature";

const kp = nacl.sign.keyPair();
const wallet = new PublicKey(kp.publicKey).toBase58();
const message = "Golazo predictions — sign to register\nWallet: x\nTime: y";
const sig = Buffer.from(
  nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey),
).toString("base64");

describe("verifyWalletSignature", () => {
  it("accepts a genuine signature from the wallet", () => {
    expect(verifyWalletSignature(wallet, message, sig)).toBe(true);
  });

  it("rejects a different message", () => {
    expect(verifyWalletSignature(wallet, message + "!", sig)).toBe(false);
  });

  it("rejects a signature from a different wallet", () => {
    const other = new PublicKey(nacl.sign.keyPair().publicKey).toBase58();
    expect(verifyWalletSignature(other, message, sig)).toBe(false);
  });

  it("rejects garbage input without throwing", () => {
    expect(verifyWalletSignature(wallet, message, "not-base64-…")).toBe(false);
    expect(verifyWalletSignature("not-a-wallet", message, sig)).toBe(false);
  });
});
