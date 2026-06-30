// Minimal, dependency-free Server-Sent Events (text/event-stream) support.
// TxLINE's /api/scores/updates/{id} is an SSE stream; this decodes it without
// pulling in a browser EventSource polyfill so it runs in the Node server.

/**
 * Incremental SSE parser. Feed raw text chunks (which may split a frame across
 * network reads); receive back the payload string of each completed event's
 * `data:` field. Multi-line data is joined with "\n"; comments (`:` heartbeats)
 * and other fields (event/id/retry) are ignored.
 */
export class SseDecoder {
  private buf = "";
  private data: string[] = [];

  push(chunk: string): string[] {
    this.buf += chunk;
    const out: string[] = [];
    let idx: number;
    while ((idx = this.buf.indexOf("\n")) !== -1) {
      let line = this.buf.slice(0, idx);
      this.buf = this.buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);

      if (line === "") {
        // blank line dispatches the buffered event
        if (this.data.length) {
          out.push(this.data.join("\n"));
          this.data = [];
        }
        continue;
      }
      if (line.startsWith(":")) continue; // comment / keep-alive

      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "data") this.data.push(value);
      // event:/id:/retry: are not needed for our row stream
    }
    return out;
  }
}

/**
 * Read an SSE response body to completion, invoking `onData` for each event's
 * payload. Stops when the stream ends or `signal` aborts.
 */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onData: (payload: string) => void | Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const sse = new SseDecoder();
  try {
    for (;;) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      for (const payload of sse.push(decoder.decode(value, { stream: true }))) {
        await onData(payload);
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released / aborted */
    }
  }
}
