"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SoccerBall, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setError(d?.error ?? "Could not log in.");
        setBusy(false);
        return;
      }
      router.push(d?.redirect ?? "/");
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
          <SoccerBall weight="fill" className="text-neon" size={24} /> Log in
        </div>
        <p className="mt-2 text-[14px] font-semibold text-slate-400">Welcome back.</p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" />
          {error && <p className="text-[13px] font-bold text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-2xl bg-neon py-3.5 text-sm font-extrabold text-ink transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] font-semibold text-slate-400">
          New here?{" "}
          <Link href="/signup" className="font-extrabold text-neon underline underline-offset-2">Create an account</Link>
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
