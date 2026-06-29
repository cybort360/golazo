"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react/dist/ssr";

// "Save my picks" — convert the ghost into a named account (keeps pick history).
// Renders its own trigger button (drop-in for the old dead buttons).
export default function ConvertDialog({ className, label }: { className?: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    if (handle.trim().length < 2) {
      setError("Pick a handle (2+ characters)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/predict/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim(), displayName: displayName.trim() || undefined }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? `Failed (${r.status})`);
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-black tracking-[-0.02em] text-ink">Save your picks</div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-ink">
                <X size={20} />
              </button>
            </div>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              Claim a handle to keep your history and climb the leaderboards. No password needed.
            </p>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s/g, "").toLowerCase())}
              placeholder="handle"
              className="mt-3 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-slate-400"
            />
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name (optional)"
              className="mt-2 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-neon py-2.5 text-sm font-black text-ink disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save my picks"}
            </button>
            {error && <p className="mt-2.5 text-center text-xs font-bold text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
