# Golazo ⚽

Golazo is a Solana-based token trading platform built around sport. Every team in a live competition gets its own Meteora token (plus the `$GOLAZO` platform token), and a share of all trading fees flows into a transparent on-chain prize pool. When a competition is decided, holders of the winning team's token receive a SOL airdrop from that pool.

The first event is the 2026 FIFA World Cup, with competitions like the Champions League and the basketball playoffs to follow.

The main site is read-only and wallet-free. Anyone can browse live prices, volume, charts, standings, brackets, and the prize pool without connecting a wallet. Trading happens on Meteora / Axiom via outbound links.

## Tech stack

- **Next.js 14** (App Router) + **React 18**, **TypeScript** (strict)
- **Tailwind CSS**
- **Vercel KV** for tournament state (results, champion, featured match, announcements)
- **football-data.org** (free tier) for live scores and results, polled server-side and fanned out via KV; standings auto-populate, with manual override in admin
- **DexScreener API** for token price data
- **Public Solana RPC** for wallet balances
- **Helius API** for the champion holder snapshot (server-side)
- **Solana Wallet Adapter**, admin routes only
