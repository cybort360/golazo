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
  mapEvent,
  mapFinalResult,
  mapState,
  type RawFixture,
  type RawScores,
  type RawScoresStatValidation,
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
      `TxLINE live mode needs ${name}. Complete the access bootstrap (see planning/txline.md) and set TXLINE_API_BASE/TXLINE_JWT/TXLINE_API_TOKEN.`,
    );
  }
  return v;
}

export class RealTxlineClient implements TxlineClient {
  readonly mode = "live" as const;

  private base() {
    return env("TXLINE_API_BASE").replace(/\/$/, "");
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${env("TXLINE_JWT")}`,
      "X-Api-Token": env("TXLINE_API_TOKEN"),
      Accept: "application/json",
    };
  }

  private async get<T>(path: string): Promise<T> {
    const r = await fetch(`${this.base()}${path}`, { headers: this.headers(), cache: "no-store" });
    if (r.status === 401) {
      throw new Error("TxLINE 401: JWT expired or token inactive — re-acquire TXLINE_JWT and re-activate.");
    }
    if (!r.ok) throw new Error(`TxLINE ${path} → HTTP ${r.status}`);
    return (await r.json()) as T;
  }

  async fixtures(opts?: { competition?: string }): Promise<TxlineFixture[]> {
    const raw = await this.get<RawFixture[]>("/api/fixtures/snapshot");
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

  async state(fixtureId: string): Promise<TxlineStateSnapshot | null> {
    const rows = await this.get<RawScores[]>(`/api/scores/snapshot/${fixtureId}`);
    if (!rows || rows.length === 0) return null;
    // snapshot returns the latest per action; the highest seq is current state
    const latest = rows.reduce((a, b) => (b.seq > a.seq ? b : a));
    return mapStateSnapshot(latest);
  }

  async liveEvents(fixtureId: string, sinceSeq?: number): Promise<TxlineLiveEvent[]> {
    const rows = await this.get<RawScores[]>(`/api/scores/updates/${fixtureId}`);
    return rows
      .filter((r) => sinceSeq === undefined || r.seq > sinceSeq)
      .sort((a, b) => a.seq - b.seq)
      .map(mapEvent);
  }

  async finalResult(fixtureId: string): Promise<TxlineFinalResult | null> {
    const rows = await this.get<RawScores[]>(`/api/scores/snapshot/${fixtureId}`);
    if (!rows || rows.length === 0) return null;
    const latest = rows.reduce((a, b) => (b.seq > a.seq ? b : a));
    if (mapState(latest.gameState) !== "FT") return null;

    // Goal-event trail (for the chaos market) + optional on-chain stat proof.
    const events = await this.get<RawScores[]>(`/api/scores/updates/${fixtureId}`).catch(() => [] as RawScores[]);
    const proof = await this.get<RawScoresStatValidation>(`/api/scores/stat-validation?fixtureId=${fixtureId}`).catch(
      () => null,
    );
    return mapFinalResult(latest, events, proof);
  }
}
