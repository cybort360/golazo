# Golazo ⚽

Golazo is a Solana-based football token trading platform built around the 2026 FIFA World Cup. Each of the 48 qualified nations has its own pump.fun token (plus the `$GOLAZO` platform token), and a share of all trading fees flows into a transparent on-chain prize pool. After the final, holders of the champion nation's token receive a SOL airdrop from that pool.

The main site is read-only and wallet-free — anyone can browse live prices, standings, the bracket, and the prize pool without connecting a wallet. Trading happens on pump.fun / Axiom via outbound links.

## Tech stack

- **Next.js 14** (App Router) + **React 18**, **TypeScript** (strict)
- **Tailwind CSS**
- **Vercel KV** for tournament state (results, champion, featured match, announcements)
- **DexScreener API** for token price data
- **Public Solana RPC** for wallet balances
- **Helius API** for the champion holder snapshot (server-side)
- **Solana Wallet Adapter** — admin routes only
