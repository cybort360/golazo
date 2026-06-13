// Telegram Bot API provider. Posts to the channel set by TELEGRAM_CHANNEL_ID
// using TELEGRAM_BOT_TOKEN. Dormant (no-op) when either env var is missing, so
// the broadcast feature is fully optional — nothing breaks if it's unconfigured.

const API_BASE = "https://api.telegram.org";

/** True only when both the bot token and target channel are configured. */
export function telegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID,
  );
}

/**
 * Send one HTML message to the configured channel. Returns true on success,
 * false on any failure (unconfigured, network, non-OK) — never throws, so a
 * broadcast attempt can never break the caller's main work.
 */
/** Send to any chat id (DMs, the channel, …). Returns false on any failure. */
export async function sendTelegramTo(
  chatId: number | string,
  text: string,
  replyMarkup?: unknown,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Post to the configured channel. No-op when the bot/channel isn't set up. */
export async function sendTelegramMessage(
  text: string,
  replyMarkup?: unknown,
): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!chatId) return false;
  return sendTelegramTo(chatId, text, replyMarkup);
}
