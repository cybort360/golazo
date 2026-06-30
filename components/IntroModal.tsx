"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  SoccerBall,
  Sparkle,
  ChartLineUp,
  SealCheck,
  Trophy,
  X,
  ArrowLeft,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

const STORAGE_KEY = "golazo_intro_seen";
const OPEN_EVENT = "golazo:open-intro";

// Call from anywhere (e.g. a navbar button) to re-open the intro on demand.
export function openIntro(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

interface Slide {
  icon: PhosphorIcon;
  kicker: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: SoccerBall,
    kicker: "The game",
    title: "Welcome to Golazo",
    body: "Make picks before kick-off. Prove you know ball. Every result is verified. No trust required.",
  },
  {
    icon: Sparkle,
    kicker: "Signature market",
    title: "The Chaos Pick",
    body: "Alongside Winner, Total goals, and BTTS, every match has a signature Chaos Pick. High risk. Maximum points.",
  },
  {
    icon: ChartLineUp,
    kicker: "Live",
    title: "Follow it live",
    body: "Watch live match states update in real time. See how your picks are tracking minute by minute.",
  },
  {
    icon: SealCheck,
    kicker: "Verified",
    title: "Verified by TxLINE",
    body: "Every settled result is verified by TxLINE and anchored on-chain. Share your proof receipt. It's permanent.",
  },
  {
    icon: Trophy,
    kicker: "Compete",
    title: "Climb private leagues",
    body: "Create or join a private league with friends. The leaderboard resets each round, so anyone can rise to the top.",
  },
];

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

export default function IntroModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // Suppressed on admin and the Telegram Mini App (their own chrome).
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/tg");

  // First-visit check (client only). Never block the first paint.
  useEffect(() => {
    if (isAdmin) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  // Manual re-open (e.g. the navbar "How it works" button).
  useEffect(() => {
    const reopen = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  const last = index === SLIDES.length - 1;
  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= SLIDES.length - 1) {
        dismiss();
        return i;
      }
      return i + 1;
    });
  }, [dismiss]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keyboard controls + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismiss, next, prev]);

  if (!open || isAdmin) return null;

  const slide = SLIDES[index];
  const SlideIcon = slide.icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close introduction"
        onClick={dismiss}
        className="absolute inset-0 cursor-default bg-ink/70 backdrop-blur-sm"
      />

      {/* card — ink ticket with a neon glow, matching the receipt aesthetic */}
      <div className="reveal relative w-full max-w-md overflow-hidden rounded-[24px] border border-[#2a2a2a] bg-ink px-6 pb-6 pt-6 shadow-card-md sm:px-8 sm:pb-8 sm:pt-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 55% at 50% -10%,rgba(212,255,63,0.18),transparent 60%)" }}
        />

        <div className="relative">
          {/* header: wordmark + step counter */}
          <div className="flex items-center justify-between">
            <div className="text-lg font-black tracking-[-0.03em] text-white">GOLAZO</div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] tabular-nums text-slate-500">
                {index + 1} / {SLIDES.length}
              </span>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Skip"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-[#171717] hover:text-slate-300"
              >
                <X weight="bold" size={15} />
              </button>
            </div>
          </div>

          {/* slide content (re-keyed so it gently re-animates each step) */}
          <div key={index} className="reveal mt-7">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(212,255,63,0.25)] bg-[rgba(212,255,63,0.1)] text-neon">
              <SlideIcon weight="fill" size={26} />
            </span>
            <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{slide.kicker}</div>
            <h2 id="intro-title" className="mt-1.5 text-2xl font-black tracking-[-0.03em] text-white">
              {slide.title}
            </h2>
            <p className="mt-2.5 min-h-[3.5rem] text-[14px] leading-relaxed text-slate-400">
              {slide.body}
            </p>
          </div>

          {/* progress dots */}
          <div className="mt-6 flex items-center gap-1.5 border-t border-dashed border-[#2a2a2a] pt-5">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cx(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-neon" : "w-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a]",
                )}
              />
            ))}
          </div>

          {/* footer */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="text-sm font-bold text-slate-500 transition-colors hover:text-slate-300"
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#2a2a2a] bg-[#171717] px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-[#1f1f1f]"
                >
                  <ArrowLeft weight="bold" size={14} />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                autoFocus
                className="inline-flex items-center gap-1.5 rounded-xl bg-neon px-5 py-2.5 text-sm font-black text-ink transition-transform hover:-translate-y-0.5"
              >
                {last ? "Start exploring" : "Next"}
                {!last && <ArrowRight weight="bold" size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
