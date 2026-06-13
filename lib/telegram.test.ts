import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { telegramConfigured, sendTelegramMessage } from "@/lib/telegram";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("telegramConfigured", () => {
  it("is false unless both token and channel are set", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "");
    expect(telegramConfigured()).toBe(false);

    vi.stubEnv("TELEGRAM_BOT_TOKEN", "tok");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "");
    expect(telegramConfigured()).toBe(false);

    vi.stubEnv("TELEGRAM_BOT_TOKEN", "tok");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "@chan");
    expect(telegramConfigured()).toBe(true);
  });
});

describe("sendTelegramMessage", () => {
  it("no-ops (false) and does not fetch when unconfigured", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendTelegramMessage("hi")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the bot sendMessage endpoint with the channel + HTML mode", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "tok123");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "@golazo");
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const ok = await sendTelegramMessage("<b>FT</b>");

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.telegram.org/bottok123/sendMessage");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      chat_id: "@golazo",
      text: "<b>FT</b>",
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  });

  it("returns false on a non-OK response", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "tok");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "@c");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false }) as Response));
    expect(await sendTelegramMessage("x")).toBe(false);
  });

  it("returns false (never throws) on a network error", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "tok");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "@c");
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network");
    }));
    expect(await sendTelegramMessage("x")).toBe(false);
  });
});
