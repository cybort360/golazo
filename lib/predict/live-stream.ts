import "server-only";
import { prisma } from "@/lib/db/client";
import { getTxlineClient } from "@/lib/txline";
import { storeEvents } from "@/lib/predict/ingest";

// Live SSE manager. Keeps one TxLINE updates stream open per in-play fixture and
// ingests pushed events the instant they arrive (sub-second), instead of waiting
// for the 30s poll. Streams open as matches go LIVE and close at FT; the poll
// remains the baseline/fallback that also promotes NOT_STARTED → LIVE.
//
// Disable with TXLINE_SSE=off. Only runs in live mode and only if the active
// client implements streamEvents (the mock omits it → poll-only, as before).

const active = new Map<string, AbortController>();

export function liveStreamCount(): number {
  return active.size;
}

export async function reconcileLiveStreams(): Promise<void> {
  if ((process.env.TXLINE_MODE ?? "mock").toLowerCase() !== "live") return;
  if (process.env.TXLINE_SSE === "off") return;

  const client = getTxlineClient();
  if (typeof client.streamEvents !== "function") return;

  const live = await prisma.match.findMany({
    where: { status: { in: ["LIVE", "HT"] } },
    select: { id: true },
  });
  const want = new Set(live.map((m) => m.id));

  // open streams for fixtures that just went live
  for (const id of want) {
    if (active.has(id)) continue;
    const ctrl = new AbortController();
    active.set(id, ctrl);
    void client
      .streamEvents(id, async (events) => {
        await storeEvents(id, events);
      }, ctrl.signal)
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          console.error(`[txline sse ${id}]`, (e as Error)?.message ?? e);
        }
      })
      .finally(() => {
        if (active.get(id) === ctrl) active.delete(id);
      });
  }

  // close streams for fixtures no longer live (FT, void, etc.)
  for (const [id, ctrl] of active) {
    if (!want.has(id)) {
      ctrl.abort();
      active.delete(id);
    }
  }
}
