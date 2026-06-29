"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchPickScreen from "@/components/predict/MatchPickScreen";
import MatchPickDesktop from "@/components/predict/MatchPickDesktop";
import { marketsEnabled } from "@/lib/markets/flags";
import WalletGate from "@/components/markets/WalletGate";
import MarketPanel from "@/components/markets/MarketPanel";

type Mode = "picks" | "market";

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-md items-center rounded-full border border-[#e2e8f0] bg-white p-1 lg:max-w-lg">
      {(["picks", "market"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={
            "flex-1 rounded-full py-2 text-[13px] font-extrabold transition " +
            (mode === m ? "bg-ink text-neon" : "text-slate-500")
          }
        >
          {m === "picks" ? "Free Picks" : "Market Mode"}
        </button>
      ))}
    </div>
  );
}

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("picks");
  const showMarket = marketsEnabled();

  useEffect(() => {
    void dataSource.getMatch(params.id).then(setMatch);
  }, [params.id]);

  if (match === undefined) {
    return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  }
  if (match === null) return notFound();

  if (showMarket && mode === "market") {
    return (
      <>
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-md pb-10 lg:max-w-lg">
          <WalletGate>
            <MarketPanel match={match} />
          </WalletGate>
        </div>
      </>
    );
  }

  return (
    <>
      {showMarket && <ModeToggle mode={mode} onChange={setMode} />}
      {/* mobile (<lg) */}
      <div className="lg:hidden">
        <MatchPickScreen match={match} />
      </div>
      {/* desktop (lg+) */}
      <MatchPickDesktop match={match} />
    </>
  );
}
