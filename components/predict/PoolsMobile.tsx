import type { SponsoredPool } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import { prizeKindLabel, formatCloses } from "@/lib/predict/pools";
import PoolCard from "@/components/predict/PoolCard";
import { Trophy, Star, Check, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

function FeaturedHero({ pool }: { pool: SponsoredPool }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink p-4 text-white">
      <Trophy weight="fill" className="pointer-events-none absolute -bottom-12 -right-8 select-none opacity-[0.06]" size={150} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white" style={{ background: pool.sponsorColor }}>
            <Star weight="fill" size={12} /> {pool.sponsor}
          </span>
          <span className="rounded-full border border-[#2a2a2a] bg-[#171717] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-300">
            Featured · {prizeKindLabel(pool.prizeKind)}
          </span>
        </div>
        <div className="mt-3 text-[20px] font-black tracking-[-0.03em]">{pool.name}</div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-neon"><Trophy weight="fill" size={14} /> {pool.prize}</div>
        <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-400">{pool.description}</p>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400">
            {formatPoints(pool.entrants)} in · {formatCloses(pool.closesAtMs)}
          </span>
          {pool.joined ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3.5 py-2 text-[12px] font-extrabold text-white">
              <Check weight="bold" size={12} /> Joined{pool.yourRank ? ` · #${pool.yourRank}` : ""}
            </span>
          ) : (
            <button type="button" className="rounded-full bg-neon px-4 py-2 text-[12px] font-extrabold text-ink">Join free ▸</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PoolsMobile({ pools }: { pools: SponsoredPool[] }) {
  const featured = pools.find((p) => p.featured) ?? null;
  const rest = pools.filter((p) => p !== featured);

  return (
    <div className="lg:hidden">
      <div className="bg-ink px-5 pb-5 pt-5 text-white">
        <div className="text-2xl font-black tracking-[-0.03em]">Pools</div>
        <div className="mt-0.5 text-xs font-semibold text-slate-400">Free-to-play prize pools · {formatPoints(pools.length)} open</div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-5">
        {featured && <FeaturedHero pool={featured} />}

        {/* compliance note */}
        <div className="flex items-start gap-1.5 rounded-xl border border-dashed border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-slate-500">
          <ShieldCheck weight="fill" size={14} className="mt-px shrink-0 text-slate-400" /> Always free to enter. Prizes are merch, access &amp; perks — never cash or wagering.
        </div>

        {rest.map((p) => <PoolCard key={p.id} pool={p} />)}

        <button type="button" className="mt-1 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 text-center text-sm font-black text-ink shadow-card">
          ＋ Run your own pool
        </button>
      </div>
    </div>
  );
}
