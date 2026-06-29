import { txlineAdapter, type LiveEvent } from "@/lib/txline/adapter";

// SSE live-match stream. Drives Market Mode status transitions (Open → Live →
// Settling) and surfaces the FT result so a keeper can settle the pool. Node
// runtime (not edge) so it can later read/write Postgres + post Merkle roots.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId") ?? "ABLRVR";
  // Compress 90 "minutes" into a short demo; default ~150ms/tick.
  const tickMs = Math.max(40, Math.min(1000, Number(searchParams.get("tickMs") ?? "150")));
  const events = txlineAdapter.liveEvents(matchId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: LiveEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ matchId, ...event })}\n\n`));
      };
      for (const event of events) {
        if (req.signal.aborted) break;
        send(event);
        if (event.type !== "ft") {
          await new Promise((r) => setTimeout(r, tickMs));
        }
      }
      controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
