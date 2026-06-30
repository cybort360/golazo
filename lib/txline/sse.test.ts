import { describe, it, expect } from "vitest";
import { SseDecoder, readSse } from "@/lib/txline/sse";

describe("SseDecoder", () => {
  it("emits a single data event on a blank-line boundary", () => {
    const d = new SseDecoder();
    expect(d.push("data: hello\n\n")).toEqual(["hello"]);
  });

  it("buffers events split across chunks", () => {
    const d = new SseDecoder();
    expect(d.push("data: par")).toEqual([]);
    expect(d.push("tial\n")).toEqual([]); // line complete, event not dispatched yet
    expect(d.push("\n")).toEqual(["partial"]); // blank line dispatches
  });

  it("joins multi-line data with newlines", () => {
    const d = new SseDecoder();
    expect(d.push("data: a\ndata: b\n\n")).toEqual(["a\nb"]);
  });

  it("ignores comments/keep-alives and other fields", () => {
    const d = new SseDecoder();
    expect(d.push(": keep-alive\nevent: ping\ndata: x\n\n")).toEqual(["x"]);
  });

  it("handles CRLF line endings and multiple events in one chunk", () => {
    const d = new SseDecoder();
    expect(d.push("data: 1\r\n\r\ndata: 2\r\n\r\n")).toEqual(["1", "2"]);
  });

  it("does not emit until the terminating blank line arrives", () => {
    const d = new SseDecoder();
    expect(d.push("data: pending\n")).toEqual([]);
  });
});

describe("readSse", () => {
  function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
    const enc = new TextEncoder();
    let i = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]));
        else controller.close();
      },
    });
  }

  it("invokes onData for each event payload across chunk boundaries", async () => {
    const got: string[] = [];
    await readSse(streamOf(["data: a\n\ndata: b", "\n\n"]), (p) => {
      got.push(p);
    });
    expect(got).toEqual(["a", "b"]);
  });

  it("stops early when the signal is already aborted", async () => {
    const got: string[] = [];
    const ctrl = new AbortController();
    ctrl.abort();
    await readSse(streamOf(["data: a\n\n"]), (p) => {
      got.push(p);
    }, ctrl.signal);
    expect(got).toEqual([]);
  });
});
