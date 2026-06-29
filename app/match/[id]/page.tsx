"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchPickScreen from "@/components/predict/MatchPickScreen";
import MatchPickDesktop from "@/components/predict/MatchPickDesktop";
import { MatchHeaderMobile, MatchHeaderDesktop } from "@/components/predict/MatchHeader";
import { marketsEnabled } from "@/lib/markets/flags";
import WalletGate from "@/components/markets/WalletGate";
import MarketPanel from "@/components/markets/MarketPanel";

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

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("picks");
  const showMarket = marketsEnabled();

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
    return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  }
  if (match === null) return notFound();

  const toggle = showMarket ? <ModeToggle mode={mode} onChange={setMode} /> : undefined;

  if (showMarket && mode === "market") {
    return (
      <>
        {/* mobile (<lg) */}
        <div className="lg:hidden">
          <MatchHeaderMobile match={match} />
          <div className="px-4 pt-4">{toggle}</div>
          <div className="px-4 pb-10 pt-4">
            <WalletGate>
              <MarketPanel match={match} />
            </WalletGate>
          </div>
        </div>
        {/* desktop (lg+) */}
        <div className="hidden lg:block">
          <MatchHeaderDesktop match={match} />
          <div className="mx-auto max-w-6xl px-8 pt-6">{toggle}</div>
          <div className="mx-auto max-w-lg px-8 pb-12 pt-6">
            <WalletGate>
              <MarketPanel match={match} />
            </WalletGate>
          </div>
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
