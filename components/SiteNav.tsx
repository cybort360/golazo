"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { openIntro } from "@/components/IntroModal";
import { usePrizePool } from "@/hooks/usePrizePool";
import { useMatchResults } from "@/hooks/useMatchResults";
import { getTodaysMatches, getMatchStatus } from "@/lib/schedule";
import { formatSol } from "@/lib/format";

// Global user-facing nav. Hidden on /admin routes, which have their own
// wallet-enabled layout and header.

// Fantasy is hidden from the nav until NEXT_PUBLIC_FANTASY_ENABLED is set, so we
// can ship the routes, sync the pool, and verify before revealing it publicly.
// (/fantasy stays directly reachable for testing in the meantime.)
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/predict", label: "Predict" },
  ...(process.env.NEXT_PUBLIC_FANTASY_ENABLED
    ? [{ href: "/fantasy", label: "Fantasy" }]
    : []),
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/prize-pool", label: "Prize Pool" },
];

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

// Segmented links pill. Rendered twice: absolutely-centered on desktop, and as
// a full-width second row on mobile, so the links never squeeze the logo or
// actions on narrow screens.
function NavLinks({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-slate-100/70 p-1">
      {LINKS.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cx(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
              active
                ? "bg-white text-green-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  const { balanceSOL } = usePrizePool();
  const { results } = useMatchResults();

  // Mounted clock so the live check is client-only (hydration-safe) and refreshes.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/tg")) return null;

  const liveNow =
    now !== null &&
    getTodaysMatches().some((m) => getMatchStatus(m, results) === "live");

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        {/* Top row: logo + actions */}
        <div className="flex h-14 items-center justify-between gap-3 md:h-16">
          <Link
            href="/"
            className="group inline-flex shrink-0 items-center gap-2"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm transition-transform group-hover:scale-105">
              <Icon name="football" size={18} strokeWidth={2} />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              Golazo
            </span>
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 lg:inline">
              World Cup 2026
            </span>
          </Link>

          {/* Desktop: links absolutely centered over the row (no side squeeze) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-16 items-center justify-center md:flex">
            <div className="pointer-events-auto">
              <NavLinks pathname={pathname} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            {liveNow && (
              <Link
                href="/"
                aria-label="A match is live now"
                className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                Live
              </Link>
            )}
            {balanceSOL !== null && (
              <Link
                href="/prize-pool"
                aria-label="View the prize pool"
                className="hidden items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100 md:inline-flex"
              >
                <Icon name="trophy" size={14} className="text-amber-500" />
                <span className="tabular-nums">{formatSol(balanceSOL)}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={openIntro}
              aria-label="How it works"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon name="help" size={16} />
              <span className="hidden sm:inline">How it works</span>
            </button>
          </div>
        </div>

        {/* Mobile: links on their own centered row */}
        <div className="flex justify-center pb-2.5 md:hidden">
          <NavLinks pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}
