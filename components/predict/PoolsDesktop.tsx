import type { SponsoredPool } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import { prizeKindLabel, formatCloses } from "@/lib/predict/pools";
import PoolCard from "@/components/predict/PoolCard";
import { Trophy, Star, Check, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

function FeaturedHero({ pool }: { pool: SponsoredPool }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-7 text-white">
      <Trophy weight="fill" className="pointer-events-none absolute -bottom-14 -right-10 select-none opacity-[0.06]" size={230} />
      <div className="relative max-w-2xl">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-extrabold text-white" style={{ background: pool.sponsorColor }}>
            <Star weight="fill" size={13} /> {pool.sponsor}
          </span>
          <span className="rounded-full border border-[#2a2a2a] bg-[#171717] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-300">
            Featured · {prizeKindLabel(pool.prizeKind)}
          </span>
        </div>
        <div className="mt-4 text-[34px] font-black tracking-[-0.03em]">{pool.name}</div>
        <div className="mt-2 flex items-center gap-2 text-[18px] font-extrabold text-neon"><Trophy weight="fill" size={19} /> {pool.prize}</div>
        <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-slate-400">{pool.description}</p>
        <div className="mt-5 flex items-center gap-5">
          {pool.joined ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-5 py-2.5 text-[14px] font-extrabold text-white">
              <Check weight="bold" size={13} /> Joined{pool.yourRank ? ` · ranked #${pool.yourRank}` : ""}
            </span>
          ) : (
            <button type="button" className="rounded-full bg-neon px-6 py-2.5 text-[14px] font-extrabold text-ink">Join free ▸</button>
          )}
          <span className="text-[13px] font-semibold text-slate-400">{formatPoints(pool.entrants)} entered · {formatCloses(pool.closesAtMs)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PoolsDesktop({ pools }: { pools: SponsoredPool[] }) {
  const featured = pools.find((p) => p.featured) ?? null;
  const rest = pools.filter((p) => p !== featured);

  return (
    <div className="hidden lg:block">
      {/* ink banner */}
      <div className="bg-ink px-8 py-7 text-white">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Free-to-play</div>
            <div className="mt-1 flex items-center gap-2 text-[28px] font-black tracking-[-0.03em]">Prize pools <Trophy weight="fill" size={26} className="text-neon" /></div>
            <div className="mt-1 text-[13px] font-semibold text-slate-400">{formatPoints(pools.length)} open · sponsored &amp; creator-run</div>
          </div>
          <button type="button" className="rounded-full bg-neon px-5 py-2.5 text-[14px] font-extrabold text-ink">＋ Run your own pool</button>
        </div>
      </div>

      <div className="px-8 py-8">
        {featured && <FeaturedHero pool={featured} />}

        {/* compliance note */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-[12px] font-semibold text-slate-500">
          <ShieldCheck weight="fill" size={15} className="mt-px shrink-0 text-slate-400" /> Pools are always free to enter. Prizes are merch, access &amp; perks — never cash or real-money wagering.
        </div>

        <div className="mt-5 grid grid-cols-2 gap-5 xl:grid-cols-3">
          {rest.map((p) => <PoolCard key={p.id} pool={p} />)}
        </div>
      </div>
    </div>
  );
}
