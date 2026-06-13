// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyInitData, telegramPlayerId } from "@/lib/telegramAuth";

const BOT_TOKEN = "123456:test-bot-token";

// Build a valid initData string the same way Telegram does, so we can verify
// against a known token.
function makeInitData(
  fields: Record<string, string>,
  token = BOT_TOKEN,
): string {
  const pairs = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  const p = new URLSearchParams(fields);
  p.set("hash", hash);
  return p.toString();
}

const user = JSON.stringify({ id: 42, username: "degen", first_name: "D" });
const fresh = () => String(Math.floor(Date.now() / 1000));

describe("verifyInitData", () => {
  it("accepts a correctly-signed payload and parses the user", () => {
    const data = makeInitData({ user, auth_date: fresh(), query_id: "x" });
    expect(verifyInitData(data, BOT_TOKEN)).toEqual({
      id: 42,
      username: "degen",
      firstName: "D",
    });
  });

  it("rejects a tampered field (hash no longer matches)", () => {
    const data = makeInitData({ user, auth_date: fresh() });
    const tampered = data.replace("degen", "whale");
    expect(verifyInitData(tampered, BOT_TOKEN)).toBeNull();
  });

  it("rejects a payload signed with a different token", () => {
    const data = makeInitData({ user, auth_date: fresh() }, "999:other");
    expect(verifyInitData(data, BOT_TOKEN)).toBeNull();
  });

  it("rejects stale initData", () => {
    const old = String(Math.floor(Date.now() / 1000) - 48 * 3600);
    const data = makeInitData({ user, auth_date: old });
    expect(verifyInitData(data, BOT_TOKEN)).toBeNull();
  });

  it("returns null without a token or data", () => {
    expect(verifyInitData("", BOT_TOKEN)).toBeNull();
    expect(verifyInitData(makeInitData({ user, auth_date: fresh() }), "")).toBeNull();
  });
});

describe("telegramPlayerId", () => {
  it("namespaces the id so it can't look like a wallet", () => {
    expect(telegramPlayerId(42)).toBe("tg:42");
  });
});
