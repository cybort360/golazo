# Landing page, real accounts, and guest gating

**Date:** 2026-07-02

## Problem

Today there is no real authentication. A "ghost" is the `glz_uid` cookie (= raw
`user.id`); "convert" just flips `isGhost→false` and sets a handle on the same
row — no password, no session — so a user cannot log in from another device. New
visitors are silently auto-ghosted by middleware, with no choice.

## Goal

- A **landing page** offering **Play as guest** or **Create account**.
- **Real accounts** (email + password) that can **log in from any device**.
- **Guests are gated**: no Market Mode, not ranked on the global leaderboard,
  cannot create/join leagues — and are continually nudged to create an account.
- **Guest → create account** carries over their history, then **logs them out**;
  they must log in again.

## Decisions (from brainstorming)

- **Auth:** email + password, fully self-contained (no external service).
- **Guest data on signup:** carried over (attach credentials to the guest's row).
- **Routing:** keep `/` as home; landing lives at `/welcome` with a
  presence-based redirect.

## 1. Auth primitives (`lib/auth/`)

- `password.ts` — `hashPassword(pw)` / `verifyPassword(pw, stored)` using Node
  `crypto.scrypt` (`salt:hash`, `timingSafeEqual`). No dependency. Pure + tested.
- `session.ts` — `signSession(userId, ttl)` / `verifySession(token)` = HMAC-SHA256
  over `userId|expiry` with `SESSION_SECRET`. Rejects tampered/expired. Tested.
- Cookies: guests keep `glz_uid` (raw id, low stakes); accounts use a **signed**
  `glz_session` httpOnly cookie. Unforgeable sessions are mandatory for accounts
  because `glz_uid` is a raw id.

## 2. Data model

Add to `User`: `email String? @unique`, `passwordHash String?`. New Prisma
migration; deploy to Neon (`prisma migrate deploy`).

## 3. Session resolution (`lib/predict/session.ts`)

- `currentUserId()` → valid `glz_session` userId (account) else `glz_uid` (guest)
  else null.
- `ensureUser()` (guest/pick path) unchanged except it also honours an account
  session.
- New `accountUserId()` helper for auth-only checks.

## 4. Routing & pages

- **`/welcome`** — Play as guest | Create account | Log in.
- **`/signup`** (email, password, handle), **`/login`** (email, password).
- **Middleware** stops auto-minting `glz_uid`. A request with neither
  `glz_session` nor `glz_uid` is redirected to `/welcome` (excluding
  `/welcome`, `/signup`, `/login`, `/api/*`, assets). Returning users skip it.

## 5. Auth APIs (`app/api/auth/*`, `app/api/guest/start`)

- `POST /api/guest/start` — mint `glz_uid` ghost, redirect target returned.
- `POST /api/auth/signup` — validate email/password/handle. If a guest row
  exists, attach `email`+`passwordHash`, `isGhost=false`, `convertedAt=now`
  (history kept); else create a new account. **Clear both cookies** → client
  redirects to `/login`.
- `POST /api/auth/login` — verify email+password → set `glz_session`, clear
  `glz_uid`.
- `POST /api/auth/logout` — clear `glz_session` + `glz_uid` → `/welcome`.
- Errors: 409 on duplicate email/handle, 401 on bad credentials, 400 on invalid
  input. Passwords never logged.

## 6. Guest gating (`lib/predict/guestGate.ts` — pure predicate)

Guests **can**: Free Picks, receipts, My Picks, and *view* the leaderboard.
Guests **cannot**:
- **Market Mode** — toggle hidden on match pages; market APIs reject guests (403).
- **Global leaderboard ranking** — `globalLeaderboardUi` filters `isGhost=false`;
  guests see a "create an account to join" prompt instead of a rank.
- **Leagues** — create/join blocked (API 403 + UI prompt).

A persistent, gentle guest nudge ("create an account to save across devices &
unlock leagues/leaderboard/Market Mode").

## 7. Security & testing

- `SESSION_SECRET` generated and set on Vercel; scrypt + HMAC.
- Unit tests: password roundtrip + wrong-password; session sign/verify (valid,
  tampered, expired); `guestGate` predicate; `/welcome` renders both CTAs.
- Existing suite stays green; tsc clean; production build passes.

## Non-goals

- No email verification, password reset, or rate limiting (prototype/devnet).
  Noted as follow-ups.
- Legacy: the single pre-existing converted ghost (no email) keeps working via
  `glz_uid`; no backfill.
