// Server-side live refresh: while the server runs, periodically pull TxLINE into
// Postgres and settle finished matches, so scores/minutes/state stay current and
// receipts/leaderboards fill in without anyone manually triggering a sync.
//
// Runs only in the Node runtime. Disable with TXLINE_AUTOSYNC=off. Interval via
// TXLINE_AUTOSYNC_MS (default 30s). Ticks never overlap.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.TXLINE_AUTOSYNC === "off") return;

  const intervalMs = Number(process.env.TXLINE_AUTOSYNC_MS ?? "30000");
  const { syncAll } = await import("@/lib/predict/ingest");
  const { settleFinished } = await import("@/lib/predict/settle");
  const { reconcileLiveStreams } = await import("@/lib/predict/live-stream");

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await syncAll();
      await settleFinished();
      // Open/close the low-latency SSE streams for whatever is now in-play.
      await reconcileLiveStreams();
    } catch (e) {
      console.error("[txline autosync]", (e as Error)?.message ?? e);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, 5_000); // first run shortly after boot
  setInterval(tick, Number.isFinite(intervalMs) ? intervalMs : 30_000);
  const sse = process.env.TXLINE_SSE === "off" ? "off" : "on";
  console.log(`[txline autosync] enabled, every ${intervalMs}ms · SSE live feed ${sse}`);
}
