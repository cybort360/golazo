"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, SignIn, X } from "@phosphor-icons/react/dist/ssr";

// Create-or-join-a-league dialog. Renders its own trigger button (drop-in for the
// old dead "Create or join a league" buttons) and a modal with both flows wired
// to the real API. On success it routes to the league's standings.
export default function LeagueDialog({ className, label }: { className?: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "create" | "join">(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: object): Promise<string> {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? `Failed (${r.status})`);
    return d.code as string;
  }

  async function create() {
    if (busy) return;
    setBusy("create");
    setError(null);
    try {
      const c = await post("/api/predict/league", { name });
      router.push(`/leagues/${c}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(null);
    }
  }
  async function join() {
    if (busy) return;
    setBusy("join");
    setError(null);
    try {
      const c = await post("/api/predict/league/join", { code });
      router.push(`/leagues/${c}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(null);
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
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-black tracking-[-0.02em] text-ink">Leagues</div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-ink">
                <X size={20} />
              </button>
            </div>

            {/* create */}
            <div className="mt-4 rounded-2xl border border-[#e2e8f0] p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Create a league</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="League name"
                className="mt-2 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={create}
                disabled={busy !== null}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-sm font-black text-neon disabled:opacity-50"
              >
                <Plus weight="bold" size={15} /> {busy === "create" ? "Creating…" : "Create league"}
              </button>
            </div>

            {/* join */}
            <div className="mt-3 rounded-2xl border border-[#e2e8f0] p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Join with a code</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="GLZ-XXXXXXXX"
                className="mt-2 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm font-mono font-semibold uppercase text-ink outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={join}
                disabled={busy !== null}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-sm font-black text-ink disabled:opacity-50"
              >
                <SignIn weight="bold" size={15} /> {busy === "join" ? "Joining…" : "Join league"}
              </button>
            </div>

            {error && <p className="mt-3 text-center text-xs font-bold text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
