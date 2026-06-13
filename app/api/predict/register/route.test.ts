// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { registerMessage } from "@/lib/predictAuth";

const h = vi.hoisted(() => ({ store: new Map<string, unknown>() }));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(async (k: string) => (h.store.has(k) ? h.store.get(k) : null)),
    set: vi.fn(async (k: string, v: unknown) => {
      h.store.set(k, v);
      return "OK";
    }),
  },
}));

import { POST } from "@/app/api/predict/register/route";

function keypair() {
  const kp = nacl.sign.keyPair();
  return { kp, wallet: new PublicKey(kp.publicKey).toBase58() };
}

function signature(kp: nacl.SignKeyPair, wallet: string, ts: number): string {
  const msg = new TextEncoder().encode(registerMessage(wallet, ts));
  return Buffer.from(nacl.sign.detached(msg, kp.secretKey)).toString("base64");
}

function req(body: unknown, ip = `${Math.random()}`): Request {
  return new Request("http://x/api/predict/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function signedBody(nickname: string, k = keypair(), ts = Date.now()) {
  return {
    nickname,
    wallet: k.wallet,
    ts,
    signature: signature(k.kp, k.wallet, ts),
  };
}

beforeEach(() => h.store.clear());

describe("POST /api/predict/register", () => {
  it("registers a signature-verified wallet and returns a token", async () => {
    const k = keypair();
    const res = await POST(req(signedBody("degen_1", k)));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(typeof data.token).toBe("string");
    expect(h.store.get(`pred:player:${k.wallet}`)).toMatchObject({
      nickname: "degen_1",
      wallet: k.wallet,
    });
  });

  it("rejects a missing signature", async () => {
    const k = keypair();
    const res = await POST(req({ nickname: "degen_1", wallet: k.wallet }));
    expect(res.status).toBe(400);
  });

  it("rejects a tampered signature", async () => {
    const k = keypair();
    const ts = Date.now();
    const bad = Buffer.from(nacl.sign.detached(new TextEncoder().encode("other"), k.kp.secretKey)).toString("base64");
    const res = await POST(req({ nickname: "degen_1", wallet: k.wallet, ts, signature: bad }));
    expect(res.status).toBe(401);
  });

  it("rejects an expired timestamp", async () => {
    const k = keypair();
    const old = Date.now() - 10 * 60 * 1000;
    const res = await POST(req(signedBody("degen_1", k, old)));
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate wallet", async () => {
    const k = keypair();
    await POST(req(signedBody("first", k)));
    const res = await POST(req(signedBody("second", k)));
    expect(res.status).toBe(409);
  });

  it("rejects a duplicate nickname (case-insensitive)", async () => {
    await POST(req(signedBody("Degen")));
    const res = await POST(req(signedBody("degen")));
    expect(res.status).toBe(409);
  });

  it("rejects an invalid nickname before checking the signature", async () => {
    const res = await POST(req(signedBody("no")));
    expect(res.status).toBe(400);
  });
});
