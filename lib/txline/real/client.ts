import type {
  TxlineClient,
  TxlineFixture,
  TxlineLiveEvent,
  TxlineStateSnapshot,
  TxlineFinalResult,
} from "@/lib/txline/client";
import {
  mapFixture,
  mapStateSnapshot,
  snapshotToEvents,
  mapFinalResult,
  type RawFixture,
  type RawScoreRow,
} from "@/lib/txline/real/map";

// Real TxLINE client — consumes the live REST API (OpenAPI v1.5.2) through the
// same seam the mock implements. The one-time access bootstrap (guest JWT →
// on-chain `subscribe` → token activate) is a manual wallet step documented in
// planning/txline.md; the resulting credentials are supplied via env:
//   TXLINE_API_BASE   e.g. https://txline.txodds.com  (or txline-dev for devnet)
//   TXLINE_JWT        guest JWT from /auth/guest/start (30-day expiry)
//   TXLINE_API_TOKEN  activated token from /api/token/activate
// This keeps wallet signing out of the request path; only HTTP + mapping here.

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `TxLINE live mode needs ${name}. Complete the access bootstrap (see planning/txline.md) and set TXLINE_API_BASE + TXLINE_API_TOKEN.`,
    );
  }
  return v;
}

export class RealTxlineClient implements TxlineClient {
  readonly mode = "live" as const;
  // Guest JWT is short-lived and freely re-acquirable; cache one and refresh on
  // 401. TXLINE_JWT may seed it, but it's optional — we mint one on demand.
  private jwt: string | null = process.env.TXLINE_JWT ?? null;

  private base() {
    return env("TXLINE_API_BASE").replace(/\/$/, "");
  }

  private async getJwt(force = false): Promise<string> {
    if (this.jwt && !force) return this.jwt;
    const r = await fetch(`${this.base()}/auth/guest/start`, { method: "POST" });
    if (!r.ok) throw new Error(`TxLINE guest auth failed: HTTP ${r.status}`);
    const data = (await r.json()) as { token?: string; jwt?: string };
    const jwt = data.token ?? data.jwt;
    if (!jwt) throw new Error("TxLINE guest auth returned no token");
    this.jwt = jwt;
    return jwt;
  }

  private async get<T>(path: string): Promise<T> {
    const token = env("TXLINE_API_TOKEN");
    const send = async (jwt: string) =>
      fetch(`${this.base()}${path}`, {
        headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": token, Accept: "application/json" },
        cache: "no-store",
      });
    let r = await send(await this.getJwt());
    if (r.status === 401) r = await send(await this.getJwt(true)); // JWT expired → refresh once
    if (r.status === 404) return null as T; // no data for this fixture yet
    if (!r.ok) throw new Error(`TxLINE ${path} → HTTP ${r.status}`);
    const text = await r.text();
    return (text ? JSON.parse(text) : null) as T; // empty body (e.g. not-started fixture)
  }

  async fixtures(opts?: { competition?: string }): Promise<TxlineFixture[]> {
    const raw = (await this.get<RawFixture[]>("/api/fixtures/snapshot")) ?? [];
    let mapped = raw.map(mapFixture);
    if (opts?.competition) mapped = mapped.filter((f) => f.competition === opts.competition);
    return mapped;
  }

  async competitions(): Promise<string[]> {
    const fx = await this.fixtures();
    return [...new Set(fx.map((f) => f.competition))];
  }

  async fixture(id: string): Promise<TxlineFixture | null> {
    return (await this.fixtures()).find((f) => f.id === id) ?? null;
  }

  // Poll the per-action snapshot for current state/score (the /updates endpoint
  // is an SSE stream, not request/response — used later for low-latency live).
  private snapshot(fixtureId: string) {
    return this.get<RawScoreRow[]>(`/api/scores/snapshot/${fixtureId}`).then((r) => r ?? []);
  }

  async state(fixtureId: string): Promise<TxlineStateSnapshot | null> {
    return mapStateSnapshot(await this.snapshot(fixtureId));
  }

  async liveEvents(fixtureId: string, sinceSeq?: number): Promise<TxlineLiveEvent[]> {
    return snapshotToEvents(await this.snapshot(fixtureId), sinceSeq);
  }

  async finalResult(fixtureId: string): Promise<TxlineFinalResult | null> {
    return mapFinalResult(await this.snapshot(fixtureId));
  }
}
