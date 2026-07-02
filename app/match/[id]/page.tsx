"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lightning } from "@phosphor-icons/react/dist/ssr";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchPickScreen from "@/components/predict/MatchPickScreen";
import MatchPickDesktop from "@/components/predict/MatchPickDesktop";
import { MatchHeaderMobile, MatchHeaderDesktop } from "@/components/predict/MatchHeader";
import { ScreenSkeleton } from "@/components/predict/Skeleton";
import { marketsEnabled } from "@/lib/markets/flags";
import WalletGate from "@/components/markets/WalletGate";
import MarketBoard from "@/components/markets/MarketBoard";
import { useMe } from "@/components/predict/useMe";

type Mode = "picks" | "market";

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-1">
        {(["picks", "market"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={
              "rounded-full px-4 py-1.5 text-[12px] font-extrabold transition " +
              (mode === m ? "bg-ink text-neon shadow-sm" : "text-slate-500 hover:text-slate-700")
            }
          >
            {m === "picks" ? "Free Picks" : "Market Mode"}
          </button>
        ))}
      </div>
    </div>
  );
}

// Guests can open Market Mode and see what it is, but staking is account-only —
// same pattern as Leagues and the global Leaderboard.
function MarketGuestPrompt() {
  return (
    <div className="rounded-2xl border border-[#26262b] bg-ink px-5 py-8 text-center text-white">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-neon">
        <Lightning weight="fill" size={24} />
      </div>
      <div className="mt-3 text-[16px] font-black">Market Mode is for members</div>
      <p className="mx-auto mt-1.5 max-w-xs text-[13px] font-semibold leading-relaxed text-slate-400">
        Create an account to stake demo GOLAZO on verified YES/NO markets. Free Picks stays open to everyone.
      </p>
      <Link
        href="/signup"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-neon px-5 py-2.5 text-[13px] font-extrabold text-ink"
      >
        Create account
      </Link>
      <div className="mt-2.5">
        <Link href="/login" className="text-[12px] font-bold text-slate-400 transition-colors hover:text-white">
          or log in
        </Link>
      </div>
    </div>
  );
}

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("picks");
  const me = useMe();
  // The toggle is visible to everyone; staking in Market Mode is account-only, so
  // guests (and unresolved identity) get a sign-up prompt instead of the panel.
  const showMarket = marketsEnabled();
  const isGuest = me?.isGhost !== false;

  useEffect(() => {
    let live = true;
    const run = () =>
      dataSource.getMatch(params.id).then((m) => {
        if (live) setMatch(m);
      }).catch(() => {});
    void run();
    const id = setInterval(run, 20000); // poll so the live header stays current
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [params.id]);

  if (match === undefined) {
    return <ScreenSkeleton variant="detail" />;
  }
  if (match === null) return notFound();

  const toggle = showMarket ? <ModeToggle mode={mode} onChange={setMode} /> : undefined;

  if (showMarket && mode === "market") {
    const marketBody = isGuest ? (
      <MarketGuestPrompt />
    ) : (
      <WalletGate>
        <MarketBoard match={match} />
      </WalletGate>
    );
    return (
      <>
        {/* mobile (<lg) */}
        <div className="lg:hidden">
          <MatchHeaderMobile match={match} />
          <div className="px-4 pt-4">{toggle}</div>
          <div className="px-4 pb-10 pt-4">{marketBody}</div>
        </div>
        {/* desktop (lg+) */}
        <div className="hidden lg:block">
          <MatchHeaderDesktop match={match} />
          <div className="mx-auto max-w-6xl px-8 pt-6">{toggle}</div>
          <div className="mx-auto max-w-lg px-8 pb-12 pt-6">{marketBody}</div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* mobile (<lg) */}
      <div className="lg:hidden">
        <MatchPickScreen match={match} toggle={toggle} />
      </div>
      {/* desktop (lg+) */}
      <MatchPickDesktop match={match} toggle={toggle} />
    </>
  );
}
