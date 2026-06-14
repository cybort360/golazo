// Shared (client + server) registration-signature contract. The client signs
// this exact message with the connected wallet; the server reconstructs it from
// the wallet + timestamp and verifies the signature. Pure — no crypto deps here
// so it's safe to import in the browser.

export const SIGN_FRESHNESS_MS = 5 * 60 * 1000;

export function registerMessage(wallet: string, ts: number): string {
  return `Golazo predictions — sign to register\nWallet: ${wallet}\nTime: ${new Date(ts).toISOString()}`;
}

// Returning players re-authenticate (e.g. on a new device, browser, or domain)
// by signing this instead — proves wallet ownership without creating an account.
export function loginMessage(wallet: string, ts: number): string {
  return `Golazo predictions — sign in\nWallet: ${wallet}\nTime: ${new Date(ts).toISOString()}`;
}

// A Telegram player links a wallet to their account by signing this. The token
// (minted server-side, bound to their Telegram id) carries that identity to the
// browser; the signature proves wallet ownership. Both are bound into one
// message so neither can be replayed against a different link request.
export function linkMessage(wallet: string, token: string, ts: number): string {
  return `Golazo predictions — link wallet to Telegram\nWallet: ${wallet}\nLink: ${token}\nTime: ${new Date(ts).toISOString()}`;
}
