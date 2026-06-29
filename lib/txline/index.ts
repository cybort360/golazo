import type { TxlineClient } from "@/lib/txline/client";
import { MockTxlineClient } from "@/lib/txline/mock/client";

export * from "@/lib/txline/client";

// The single swap point. `TXLINE_MODE=live` selects the real client once it's
// implemented; everything else uses the scripted World Cup mock. Keep this the
// ONLY place that decides which implementation runs.
export function getTxlineClient(): TxlineClient {
  const mode = (process.env.TXLINE_MODE ?? "mock").toLowerCase();
  if (mode === "live") return new RealTxlineClient();
  return new MockTxlineClient();
}

/**
 * Real TxLINE client — the last piece that brings everything alive. When API
 * access lands, implement each method against the live endpoints/stream and set
 * TXLINE_MODE=live. Until then it fails loudly rather than silently degrading.
 */
export class RealTxlineClient implements TxlineClient {
  readonly mode = "live" as const;
  private fail(): never {
    throw new Error(
      "TxLINE live mode is not implemented yet. Set TXLINE_MODE=mock, or implement RealTxlineClient against the TxLINE API (see lib/txline/client.ts).",
    );
  }
  async competitions() {
    return this.fail();
  }
  async fixtures() {
    return this.fail();
  }
  async fixture() {
    return this.fail();
  }
  async state() {
    return this.fail();
  }
  async liveEvents() {
    return this.fail();
  }
  async finalResult() {
    return this.fail();
  }
}
