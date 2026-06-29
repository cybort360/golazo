import type { SponsoredPool } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import { prizeKindLabel, formatCloses } from "@/lib/predict/pools";
import { Users, Star, Trophy, Check } from "@phosphor-icons/react/dist/ssr";

export default function PoolCard({ pool }: { pool: SponsoredPool }) {
  return (
    <div data-testid={`pool-${pool.id}`} className="flex flex-col rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white" style={{ background: pool.sponsorColor }}>
          {pool.creator ? <Users weight="fill" size={12} /> : <Star weight="fill" size={12} />} {pool.sponsor}
        </span>
        <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
          {prizeKindLabel(pool.prizeKind)}
        </span>
      </div>

      <div className="mt-3 text-[16px] font-black tracking-[-0.02em] text-ink">{pool.name}</div>
      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#f8fafc] px-3 py-2.5">
        <Trophy weight="fill" size={15} className="text-amber-500" />
        <span className="text-[12px] font-bold text-ink">{pool.prize}</span>
      </div>
      <p className="mt-2.5 text-[12px] font-medium leading-relaxed text-slate-500">{pool.description}</p>

      <div className="mt-3 flex items-center justify-between border-t border-[#f1f5f9] pt-3">
        <div className="text-[11px] font-semibold text-slate-500">
          {formatPoints(pool.entrants)}{pool.capacity ? ` / ${formatPoints(pool.capacity)}` : ""} in · {formatCloses(pool.closesAtMs)}
        </div>
        {pool.joined ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-[12px] font-extrabold text-white">
            <Check weight="bold" size={12} /> Joined{pool.yourRank ? ` · #${pool.yourRank}` : ""}
          </span>
        ) : (
          <button type="button" className="rounded-full bg-neon px-4 py-1.5 text-[12px] font-extrabold text-ink">
            Join free ▸
          </button>
        )}
      </div>
    </div>
  );
}
