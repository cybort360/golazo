// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const h = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/telegram", () => ({ sendTelegramTo: h.send }));

import { POST } from "@/app/api/telegram/webhook/route";

function req(body: unknown, secret?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== undefined) headers["x-telegram-bot-api-secret-token"] = secret;
  return new Request("http://x/api/telegram/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  h.send.mockClear();
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "s3cret");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://golazo.fun");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/telegram/webhook", () => {
  it("replies to /start with a Play button", async () => {
    const res = await POST(
      req({ message: { text: "/start", chat: { id: 99 } } }, "s3cret"),
    );
    expect(res.status).toBe(200);
    expect(h.send).toHaveBeenCalledTimes(1);
    const [chatId, , markup] = h.send.mock.calls[0];
    expect(chatId).toBe(99);
    expect(JSON.stringify(markup)).toContain("https://golazo.fun/tg");
  });

  it("rejects a call without the secret header", async () => {
    const res = await POST(req({ message: { text: "/start", chat: { id: 1 } } }, "wrong"));
    expect(res.status).toBe(401);
    expect(h.send).not.toHaveBeenCalled();
  });

  it("ignores non-/start messages", async () => {
    await POST(req({ message: { text: "hello", chat: { id: 1 } } }, "s3cret"));
    expect(h.send).not.toHaveBeenCalled();
  });
});
