"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SoccerBall, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, handle, password }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setError(d?.error ?? "Could not create account.");
        setBusy(false);
        return;
      }
      // Account created; user must now log in fresh.
      setDone(true);
      setTimeout(() => router.push("/login"), 900);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <Link href="/welcome" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="flex items-center gap-2 text-[22px] font-black tracking-[-0.04em]">
          <SoccerBall weight="fill" className="text-neon" size={24} /> Create account
        </div>
        <p className="mt-2 text-[14px] font-semibold text-slate-400">
          Save your picks and play from any device.
        </p>

        {done ? (
          <div className="mt-8 rounded-2xl border border-[#2a2a2a] bg-[#171717] px-5 py-6 text-center text-sm font-bold text-neon">
            Account created. Taking you to log in…
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" />
            <Field label="Handle" value={handle} onChange={setHandle} placeholder="your_name" autoComplete="username" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
            {error && <p className="text-[13px] font-bold text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-2xl bg-neon py-3.5 text-sm font-extrabold text-ink transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[13px] font-semibold text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-extrabold text-neon underline underline-offset-2">Log in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-neon focus:outline-none"
      />
    </label>
  );
}
