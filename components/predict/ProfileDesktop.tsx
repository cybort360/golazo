import Link from "next/link";
import type { ProfileStats } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";
import ShareButton from "@/components/predict/ShareButton";

function StatCard({ label, value, accent, sub }: { label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white px-5 py-5 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className={"mt-1.5 text-[30px] font-black leading-none tabular-nums " + (accent ? "text-[#16a34a]" : "text-ink")}>{value}</div>
      {sub && <div className="mt-1.5 text-[12px] font-semibold text-slate-500">{sub}</div>}
    </div>
  );
}

export default function ProfileDesktop({ profile }: { profile: ProfileStats }) {
  return (
    <div className="hidden lg:block">
      {/* ink banner */}
      <div className="bg-ink px-8 py-8 text-white">
        <div className="flex items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <span
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-neon text-[24px] font-extrabold text-neon"
              style={{ background: profile.color }}
            >
              {profile.initials}
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Public profile</div>
              <div className="mt-1 text-[30px] font-black tracking-[-0.03em]">{profile.displayName}</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-400">@{profile.handle} · {profile.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {profile.globalRank !== null && (
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Global rank</div>
                <div className="text-[34px] font-black leading-none tracking-[-0.04em] tabular-nums">#{formatPoints(profile.globalRank)}</div>
              </div>
            )}
            <ShareButton
              path={`/u/${profile.handle}`}
              title={`${profile.displayName} on Golazo`}
              text={`${formatAccuracy(profile.accuracy)} accuracy · ${profile.currentStreak}-pick streak. Prove you know ball.`}
              className="rounded-full bg-neon px-6 py-3 text-[14px] font-extrabold text-ink"
              label="Share profile ▸"
            />
          </div>
        </div>
      </div>

      {/* stats grid */}
      <div className="px-8 py-8">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Accuracy" value={formatAccuracy(profile.accuracy)} accent sub={`${profile.wins} of ${profile.totalPicks} verified correct`} />
          <StatCard label="Current streak" value={`🔥 ${profile.currentStreak}`} sub="consecutive correct picks" />
          <StatCard label="Total points" value={`+${formatPoints(profile.points)}`} sub="across all settled picks" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white px-6 py-5 shadow-card">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Favorite market</div>
            <div className="mt-1.5 text-[22px] font-black text-ink">{profile.favoriteMarket}</div>
            <div className="mt-1 text-[13px] font-semibold text-slate-500">Where this player makes the most calls</div>
          </div>
          {profile.biggestUpset && (
            <div className="rounded-2xl bg-ink px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-neon">⚡ Biggest upset called</div>
                <span className="text-[18px] font-black tabular-nums text-neon">+{formatPoints(profile.biggestUpset.points)}</span>
              </div>
              <div className="mt-2 text-[18px] font-extrabold">{profile.biggestUpset.label}</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-400">{profile.biggestUpset.detail} · verified by TxLINE</div>
            </div>
          )}
        </div>

        <Link href="/receipts" className="mt-4 inline-block text-[13px] font-bold text-slate-500 hover:text-ink">
          View verified history ▸
        </Link>
      </div>
    </div>
  );
}
