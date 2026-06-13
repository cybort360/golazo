// Verify a Telegram Mini App's initData server-side: it proves which Telegram
// user opened the app, signed by Telegram with our bot token. Standard HMAC
// scheme from Telegram's "Validating data received via the Mini App" docs.
//
// Server-only (uses node crypto + the bot token). Never throws — returns null
// on anything malformed or unverified.

import { createHmac } from "crypto";

export interface TelegramUser {
  id: number;
  username: string | null;
  firstName: string | null;
}

// Reject initData older than this to blunt replay of a captured payload.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function verifyInitData(
  initData: string,
  botToken: string | undefined = process.env.TELEGRAM_BOT_TOKEN,
): TelegramUser | null {
  if (!botToken || !initData) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;

  // data_check_string: every field except `hash`, "key=value" sorted by key,
  // joined by newlines.
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  if (computed !== hash) return null;

  // Freshness (auth_date is unix seconds).
  const authDate = Number(params.get("auth_date"));
  if (Number.isFinite(authDate) && Date.now() - authDate * 1000 > MAX_AGE_MS) {
    return null;
  }

  // The user is a JSON blob in the `user` field.
  try {
    const raw = params.get("user");
    if (!raw) return null;
    const u = JSON.parse(raw) as {
      id?: number;
      username?: string;
      first_name?: string;
    };
    if (typeof u.id !== "number") return null;
    return {
      id: u.id,
      username: u.username ?? null,
      firstName: u.first_name ?? null,
    };
  } catch {
    return null;
  }
}

/** Stable player id for a Telegram user, namespaced so it can't collide with a
 *  base58 wallet address. */
export function telegramPlayerId(userId: number): string {
  return `tg:${userId}`;
}
