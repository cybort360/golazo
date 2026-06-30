import { timingSafeEqual } from "crypto";
import { sendTelegramTo } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/** Constant-time string compare; false on length mismatch (never throws). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Receives Telegram bot updates (set via setWebhook). Today it just answers
// /start with a Play button that opens the Mini App, so DMing the bot isn't a
// dead end. Verified by a secret header so only Telegram can call it.

interface TgUpdate {
  message?: { text?: string; chat?: { id?: number } };
}

/** A button that launches the Mini App: web_app (in-chat) when we have the site
 *  URL, else a plain link to the t.me Mini App, else nothing. */
function playButton(): unknown {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    return { inline_keyboard: [[{ text: "🔮 Play Golazo", web_app: { url: `${site}/tg` } }]] };
  }
  const app = process.env.NEXT_PUBLIC_TELEGRAM_APP_URL;
  return app ? { inline_keyboard: [[{ text: "🔮 Play Golazo", url: app }]] } : undefined;
}

const WELCOME =
  "👋 <b>Golazo</b>: predict the World Cup, win SOL.\n\n" +
  "No wallet needed. Your Telegram is your login. Tap below to play 👇";

export async function POST(request: Request) {
  // Fail closed: no secret configured → reject (don't run an open endpoint that
  // could be driven to spam arbitrary chats through our bot).
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected || !safeEqual(got, expected)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return Response.json({ ok: true }); // ack so Telegram doesn't retry
  }

  const text = update.message?.text ?? "";
  const chatId = update.message?.chat?.id;
  if (chatId !== undefined && text.startsWith("/start")) {
    await sendTelegramTo(chatId, WELCOME, playButton());
  }

  return Response.json({ ok: true });
}
