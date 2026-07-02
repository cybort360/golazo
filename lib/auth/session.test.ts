import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "@/lib/auth/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-16-chars";
});

describe("session tokens", () => {
  it("round-trips a valid token to its user id", () => {
    const token = signSession("user_123");
    expect(verifySession(token)).toBe("user_123");
  });

  it("rejects a tampered token", () => {
    const token = signSession("user_123");
    const [id, exp] = token.split(".");
    const forged = `user_999.${exp}.${token.split(".")[2]}`;
    expect(verifySession(forged)).toBeNull();
    // also a flipped signature byte
    const flipped = `${id}.${exp}.${"0".repeat(64)}`;
    expect(verifySession(flipped)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signSession("user_123", -10); // already expired
    expect(verifySession(token)).toBeNull();
  });

  it("rejects empty / malformed input", () => {
    expect(verifySession(null)).toBeNull();
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("garbage")).toBeNull();
  });
});
