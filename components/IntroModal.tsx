"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

const STORAGE_KEY = "golazo_intro_seen";
const OPEN_EVENT = "golazo:open-intro";

// Call from anywhere (e.g. a navbar button) to re-open the intro on demand.
export function openIntro(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

interface Slide {
  icon: IconName;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "football",
    title: "Welcome to Golazo",
    body: "Trade tokens for the teams you love across the biggest competitions in sport, all on Solana. From the World Cup to the Champions League to the basketball playoffs.",
  },
  {
    icon: "coins",
    title: "Every team has a token",
    body: "Back your favorites and buy them on pump.fun. Live prices, volume and charts for every team.",
  },
  {
    icon: "trophy",
    title: "Win the prize pool",
    body: "35% of all trading fees fund a SOL prize pool. When the final whistle blows, champion-token holders split it.",
  },
  {
    icon: "chart",
    title: "Follow every game",
    body: "Live match banners, standings and brackets, updated automatically as results come in.",
  },
];

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

export default function IntroModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const isAdmin = pathname?.startsWith("/admin");

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
        className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"
      />

      {/* card */}
      <div className="reveal relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-card-md sm:p-8">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <Icon name="close" size={16} />
        </button>

        {/* slide content (re-keyed so it gently re-animates each step) */}
        <div key={index} className="reveal flex flex-col items-center text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <Icon name={slide.icon} size={26} strokeWidth={1.8} />
          </span>
          <h2
            id="intro-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            {slide.title}
          </h2>
          <p className="mt-2 min-h-[3.5rem] max-w-xs text-sm leading-relaxed text-slate-500">
            {slide.body}
          </p>
        </div>

        {/* progress dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cx(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-green-600" : "w-1.5 bg-slate-200 hover:bg-slate-300",
              )}
            />
          ))}
        </div>

        {/* footer */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={prev}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Icon name="left" size={14} />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              autoFocus
              className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              {last ? "Start exploring" : "Next"}
              {!last && <Icon name="right" size={14} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
