import type { Match } from "@/lib/predict/types";
import MatchCard from "@/components/predict/MatchCard";
import { SoccerBall } from "@phosphor-icons/react/dist/ssr";

function Group({ label, dot, matches }: { label: string; dot?: boolean; matches: Match[] }) {
  if (matches.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        {dot && <span className="glz-pulse h-2 w-2 rounded-full bg-neon" />}
        <h2 className="text-[11px] font-black uppercase tracking-[0.13em] text-ink">{label}</h2>
        <span className="text-[11px] font-bold text-slate-400">{matches.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {matches.map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
    </section>
  );
}

export default function MatchesDesktop({ matches }: { matches: Match[] }) {
  const inPlay = matches.filter((m) => m.state === "LIVE" || m.state === "HT");
  const upcoming = matches.filter((m) => m.state === "NOT_STARTED");
  const finished = matches.filter((m) => m.state === "FT" || m.state === "VOID");

  return (
    <div className="hidden lg:block">
      {/* ink banner */}
      <div className="relative overflow-hidden bg-ink px-8 py-7 text-white">
        <SoccerBall weight="fill" className="pointer-events-none absolute -bottom-10 right-6 select-none opacity-[0.05]" size={150} />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[30px] font-black tracking-[-0.04em]">Matches</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">Pick before kickoff: Winner, Over/Under, BTTS and the Chaos special.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <span className="rounded-full bg-neon px-4 py-2 text-[13px] font-extrabold text-ink">Today</span>
            <span className="rounded-full border border-[#2a2a2a] bg-[#171717] px-4 py-2 text-[13px] font-bold text-slate-300">Tomorrow</span>
            <span className="rounded-full border border-[#2a2a2a] bg-[#171717] px-4 py-2 text-[13px] font-bold text-slate-300">This week</span>
          </div>
        </div>
      </div>

      {/* grouped grids */}
      <div className="px-8 py-7">
        <Group label="In-play now" dot matches={inPlay} />
        <Group label="Upcoming" matches={upcoming} />
        <Group label="Results" matches={finished} />
      </div>
    </div>
  );
}
