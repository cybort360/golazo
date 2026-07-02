"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SoccerBall,
  UserCirclePlus,
  SignIn,
  Ghost,
  SealCheck,
  Lightning,
  ArrowRight,
  Check,
} from "@phosphor-icons/react/dist/ssr";

/* ─────────────────────────────────────────────────────────────────────────
   Featured pick card — a faithful mockup of the real match-pick surface, so
   the landing SHOWS the product instead of describing it. Static (no API call,
   so viewing the landing never mints a ghost).
   ───────────────────────────────────────────────────────────────────────── */

function Flag({ code }: { code: string }) {
  return <span className={`fi fi-${code} rounded-[3px]`} style={{ width: 26, height: 19 }} />;
}

function Option({ label, pct, selected }: { label: string; pct: string; selected?: boolean }) {
  return (
    <div
      className={
        "flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-colors " +
        (selected
          ? "border-neon bg-neon/[0.12] text-white shadow-[0_0_0_1px_#d4ff3f_inset]"
          : "border-white/10 bg-white/[0.03] text-slate-300")
      }
    >
      <span className="text-[12px] font-extrabold">{label}</span>
      <span className={"text-[11px] font-bold tabular-nums " + (selected ? "text-neon" : "text-slate-500")}>{pct}</span>
    </div>
  );
}

function PickCard() {
  return (
    <div className="glz-float-soft relative w-full max-w-[340px]" style={{ ["--glz-tilt" as string]: "-1.5deg" }}>
      {/* neon under-glow that grounds the card without cornering the page */}
      <div className="absolute inset-x-6 -bottom-3 h-10 rounded-full bg-neon/20 blur-2xl" aria-hidden />

      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#141414] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
        {/* moving sheen */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="glz-card-sheen absolute -inset-y-4 left-0 w-16 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Group C · Matchday 2</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-neon">
            <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" /> LIVE 63&apos;
          </span>
        </div>

        {/* teams */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex flex-col items-center gap-1.5">
            <Flag code="br" />
            <span className="text-[13px] font-extrabold text-white">BRA</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[22px] font-black tabular-nums text-white">2–1</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">2nd half</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Flag code="ar" />
            <span className="text-[13px] font-extrabold text-white">ARG</span>
          </div>
        </div>

        {/* market */}
        <div className="px-4 pb-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Who wins?</div>
          <div className="flex gap-2">
            <Option label="Brazil" pct="61%" selected />
            <Option label="Draw" pct="21%" />
            <Option label="Argentina" pct="18%" />
          </div>
        </div>

        {/* chaos pick */}
        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-xl border border-neon/40 bg-neon/[0.06] px-3 py-2.5">
          <Lightning weight="fill" size={18} className="shrink-0 text-neon" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold text-white">Chaos Pick · 4+ goals &amp; a red card</div>
            <div className="text-[10px] font-semibold text-slate-400">High risk · maximum points</div>
          </div>
          <span className="shrink-0 rounded-md bg-neon px-2 py-1 text-[11px] font-black text-ink">+50</span>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <SealCheck weight="fill" size={14} className="text-neon" /> Verified by TxLINE
          </span>
          <span className="text-[10px] font-bold tabular-nums text-slate-500">12,483 picks locked</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tactics-board backdrop. Faint pitch markings plus dotted shot/pass trajectory
   curves (chalked in via a dash animation), with balls tracing each path. The
   traveling balls are gated on prefers-reduced-motion.
   ───────────────────────────────────────────────────────────────────────── */

const CURVES = [
  "M -60 540 C 200 400 380 640 640 460 C 860 310 1080 420 1280 300",
  "M -60 250 C 240 350 520 170 780 330 C 1000 470 1180 320 1280 430",
  "M 100 840 C 300 640 520 720 720 560 C 900 415 1080 520 1280 400",
];
const CURVE_DUR = ["8s", "11s", "9.5s"];

function TacticsBackdrop() {
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setMotion(true);
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none">
        {/* faint pitch markings */}
        <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1.5">
          <circle cx="600" cy="400" r="150" />
          <line x1="600" y1="95" x2="600" y2="705" />
          <path d="M 120 300 A 150 150 0 0 1 120 500" />
          <path d="M 1080 300 A 150 150 0 0 0 1080 500" />
        </g>
        <circle cx="600" cy="400" r="3" fill="#ffffff" fillOpacity="0.08" />

        {/* trajectory curves (dashed, self-drawing) + endpoint nodes */}
        {CURVES.map((d, i) => (
          <g key={i}>
            <path
              id={`traj-${i}`}
              d={d}
              className="glz-traj"
              stroke="#d4ff3f"
              strokeOpacity="0.16"
              strokeWidth="2"
              style={{ animationDelay: `${-i * 2.4}s` }}
            />
          </g>
        ))}

        {/* balls tracing each trajectory */}
        {motion &&
          CURVES.map((_, i) => (
            <g key={i}>
              <circle r="9" fill="#d4ff3f" opacity="0.16">
                <animateMotion dur={CURVE_DUR[i]} repeatCount="indefinite" begin={`${i * 1.3}s`}>
                  <mpath href={`#traj-${i}`} />
                </animateMotion>
              </circle>
              <circle r="3.5" fill="#d4ff3f">
                <animateMotion dur={CURVE_DUR[i]} repeatCount="indefinite" begin={`${i * 1.3}s`}>
                  <mpath href={`#traj-${i}`} />
                </animateMotion>
              </circle>
            </g>
          ))}
      </svg>

      {/* subtle vignette for depth (darkens edges, not a glow) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_58%_at_50%_42%,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */

export default function WelcomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function playAsGuest() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/guest/start", { method: "POST" });
      const d = await r.json().catch(() => null);
      router.push(d?.redirect ?? "/");
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-white">
      {/* tactics-board backdrop: pitch markings + trajectory curves */}
      <TacticsBackdrop />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6">
        {/* header */}
        <header className="glz-rise flex items-center justify-between py-6">
          <div className="flex items-center gap-2 text-[22px] font-black tracking-[-0.04em]">
            <SoccerBall weight="fill" className="text-neon" size={26} /> GOLAZO
          </div>
          <Link href="/login" className="text-[13px] font-bold text-slate-300 transition-colors hover:text-white">
            Log in
          </Link>
        </header>

        {/* hero */}
        <main className="flex flex-1 flex-col items-center gap-12 py-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          {/* left: copy + CTAs */}
          <div className="w-full max-w-xl text-center lg:text-left">
            <div className="glz-rise" style={{ animationDelay: "0.05s" }}>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-neon">
                <Lightning weight="fill" size={12} /> Free-to-play · Verified results
              </span>
            </div>

            <h1
              className="glz-rise mt-5 text-[46px] font-black leading-[0.95] tracking-[-0.045em] sm:text-[58px] lg:text-[64px]"
              style={{ animationDelay: "0.1s" }}
            >
              Prove you
              <br />
              <span className="glz-text-gradient">know ball.</span>
            </h1>

            <p
              className="glz-rise mx-auto mt-5 max-w-md text-[16px] font-semibold leading-relaxed text-slate-400 lg:mx-0"
              style={{ animationDelay: "0.16s" }}
            >
              Call the winner, the goals, and the Chaos Pick on every World Cup 2026 match.
              Every result is verified on-chain, no trust required.
            </p>

            {/* CTAs */}
            <div
              className="glz-rise mt-8 flex flex-col gap-3 sm:mx-auto sm:max-w-md lg:mx-0"
              style={{ animationDelay: "0.22s" }}
            >
              <Link
                href="/signup"
                className="group flex items-center justify-center gap-2 rounded-2xl bg-neon py-4 text-[15px] font-extrabold text-ink shadow-[0_10px_36px_-10px_rgba(212,255,63,0.7)] transition-transform hover:scale-[1.015] active:scale-[0.99]"
              >
                <UserCirclePlus size={19} weight="fill" /> Create your account
                <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                onClick={playAsGuest}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] py-4 text-[15px] font-extrabold text-white backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/[0.07] disabled:opacity-60"
              >
                <Ghost size={19} weight="fill" /> {busy ? "Starting…" : "Play as guest"}
              </button>
              <Link
                href="/login"
                className="mt-0.5 flex items-center justify-center gap-2 py-1 text-sm font-bold text-slate-400 transition-colors hover:text-white lg:hidden"
              >
                <SignIn size={16} /> Already have an account? <span className="text-white">Log in</span>
              </Link>
            </div>

            {/* trust row */}
            <div
              className="glz-rise mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold text-slate-500 lg:justify-start"
              style={{ animationDelay: "0.28s" }}
            >
              <span className="inline-flex items-center gap-1.5"><Check weight="bold" size={13} className="text-neon" /> No wallet needed</span>
              <span className="inline-flex items-center gap-1.5"><Check weight="bold" size={13} className="text-neon" /> Play across devices</span>
              <span className="inline-flex items-center gap-1.5"><Check weight="bold" size={13} className="text-neon" /> On-chain proof</span>
            </div>
          </div>

          {/* right: floating product card */}
          <div className="glz-rise flex w-full justify-center lg:justify-end" style={{ animationDelay: "0.18s" }}>
            <PickCard />
          </div>
        </main>

        {/* footer */}
        <footer className="glz-rise pb-7 pt-4 text-center text-[11px] font-semibold text-slate-600 lg:text-left" style={{ animationDelay: "0.34s" }}>
          Guests can play free picks anytime. Create an account to join leagues, the global
          leaderboard, and Market Mode.
        </footer>
      </div>
    </div>
  );
}
