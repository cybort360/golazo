import Link from "next/link";
import type { ProfileStats } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";
import ShareButton from "@/components/predict/ShareButton";
import BadgeShelf from "@/components/predict/BadgeShelf";

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-ink px-3 py-3.5 text-center">
      <div className={"text-[22px] font-black leading-none tabular-nums " + (accent ? "text-neon" : "text-white")}>{value}</div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</div>
    </div>
  );
}

export default function ProfileScreen({ profile }: { profile: ProfileStats }) {
  return (
    <div className="bg-[#f8fafc] lg:hidden">
      {/* ink header — full bleed */}
      <section className="relative overflow-hidden bg-ink px-5 pb-6 pt-6 text-white">
        <div className="pointer-events-none absolute -bottom-12 -right-8 select-none text-[150px] font-black opacity-[0.06]">⚽</div>
        <div className="relative">
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-[1.5px] border-neon text-[18px] font-extrabold text-neon"
              style={{ background: profile.color }}
            >
              {profile.initials}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[22px] font-black tracking-[-0.03em]">{profile.displayName}</div>
              <div className="truncate text-[12px] font-semibold text-slate-400">@{profile.handle} · {profile.tagline}</div>
            </div>
          </div>
          {profile.globalRank !== null && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-[12px] font-bold text-slate-300">
              🌍 Global rank <span className="font-black text-neon">#{formatPoints(profile.globalRank)}</span>
            </div>
          )}
          <ShareButton
            path={`/u/${profile.handle}`}
            title={`${profile.displayName} on Golazo`}
            text={`${formatAccuracy(profile.accuracy)} accuracy · ${profile.currentStreak}-pick streak. Prove you know ball.`}
            className="mt-4 w-full rounded-full bg-neon py-3 text-center text-[14px] font-extrabold text-ink"
            label="Share my profile"
          />
        </div>
      </section>

      <div className="flex flex-col gap-4 px-4 py-5">
        {/* headline stat tiles */}
        <div className="grid grid-cols-3 gap-2.5">
          <Tile label="Accuracy" value={formatAccuracy(profile.accuracy)} accent />
          <Tile label="Streak" value={`🔥${profile.currentStreak}`} />
          <Tile label="Points" value={`+${formatPoints(profile.points)}`} />
        </div>

        {/* favorite market */}
        <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 shadow-card">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Favorite market</div>
          <div className="mt-1 text-[17px] font-black text-ink">{profile.favoriteMarket}</div>
          <div className="mt-0.5 text-[12px] font-semibold text-slate-500">{profile.wins} of {profile.totalPicks} picks verified correct</div>
        </div>

        {/* biggest upset */}
        {profile.biggestUpset && (
          <div className="rounded-2xl bg-ink px-4 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-neon">⚡ Biggest upset called</div>
              <span className="text-[15px] font-black tabular-nums text-neon">+{formatPoints(profile.biggestUpset.points)}</span>
            </div>
            <div className="mt-1.5 text-[15px] font-extrabold">{profile.biggestUpset.label}</div>
            <div className="mt-0.5 text-[12px] font-semibold text-slate-400">{profile.biggestUpset.detail} · verified by TxLINE</div>
          </div>
        )}

        {/* badges */}
        <BadgeShelf badges={profile.badges} />

        <Link href="/wallet" className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 text-sm font-bold shadow-card">
          <span>◎ Wallet &amp; on-chain rewards</span>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Preview</span>
        </Link>

        <Link href="/receipts" className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 text-center text-sm font-bold text-slate-600 shadow-card">
          View verified history ▸
        </Link>
      </div>
    </div>
  );
}
