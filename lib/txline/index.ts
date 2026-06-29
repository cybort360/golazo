import type { TxlineClient } from "@/lib/txline/client";
import { MockTxlineClient } from "@/lib/txline/mock/client";
import { RealTxlineClient } from "@/lib/txline/real/client";

export * from "@/lib/txline/client";
export { RealTxlineClient } from "@/lib/txline/real/client";

// The single swap point. `TXLINE_MODE=live` selects the real client (consuming
// the live TxLINE REST API via supplied creds); everything else uses the
// scripted World Cup mock. Keep this the ONLY place that decides which runs.
export function getTxlineClient(): TxlineClient {
  const mode = (process.env.TXLINE_MODE ?? "mock").toLowerCase();
  if (mode === "live") return new RealTxlineClient();
  return new MockTxlineClient();
}
