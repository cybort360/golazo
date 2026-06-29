import type { Badge } from "@/lib/predict/types";
import { Crown, Sparkle, HandPalm, Target, SoccerBall, Flame, Medal } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

const BADGE_ICONS: Record<string, Icon> = {
  chaos_king: Crown,
  underdog_prophet: Sparkle,
  clean_sheet_demon: HandPalm,
  sharpshooter: Target,
  goal_machine: SoccerBall,
  on_fire: Flame,
};

function BadgeTile({ badge }: { badge: Badge }) {
  const earned = badge.earned;
  const Ic = BADGE_ICONS[badge.id] ?? Medal;
  return (
    <div
      data-testid={`badge-${badge.id}`}
      data-earned={earned}
      title={badge.description}
      className={
        "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-center " +
        (earned
          ? "border border-[#e2e8f0] bg-white shadow-card"
          : "border border-dashed border-slate-200 bg-slate-50")
      }
    >
      <Ic size={26} weight={earned ? "fill" : "regular"} className={earned ? "text-ink" : "text-slate-300"} />
      <div className={"text-[11px] font-extrabold leading-tight " + (earned ? "text-ink" : "text-slate-400")}>
        {badge.name}
      </div>
      {earned ? (
        <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-white">
          Earned
        </span>
      ) : badge.progress ? (
        <span className="text-[9px] font-bold tabular-nums text-slate-400">
          {badge.progress.current}/{badge.progress.target}
        </span>
      ) : (
        <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-slate-300">Locked</span>
      )}
    </div>
  );
}

export default function BadgeShelf({ badges }: { badges: Badge[] }) {
  const earnedCount = badges.filter((b) => b.earned).length;
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Badges</div>
        <div className="text-[11px] font-bold tabular-nums text-slate-500">{earnedCount}/{badges.length} earned</div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-6 lg:gap-3">
        {badges.map((b) => <BadgeTile key={b.id} badge={b} />)}
      </div>
    </div>
  );
}
