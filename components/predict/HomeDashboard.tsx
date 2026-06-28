import Link from "next/link";
import type { Match, League, ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import MatchListItem from "@/components/predict/MatchListItem";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{children}</div>;
}

export default function HomeDashboard({
  liveMatches, leagues, receipts,
}: {
  liveMatches: Match[];
  leagues: League[];
  receipts: ProofReceipt[];
}) {
  const receipt = receipts[0] ?? null;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-black tracking-tight">
        Make picks. <span className="rounded bg-neon px-1">Prove you know ball.</span>
      </h1>

      <section>
        <Label>⚡ Live now</Label>
        {liveMatches.length > 0 ? (
          <div className="flex flex-col gap-2">
            {liveMatches.map((m) => <MatchListItem key={m.id} match={m} />)}
          </div>
        ) : (
          <Link href="/matches" className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-sm text-slate-500 shadow-card">
            No live matches right now — browse all fixtures ▸
          </Link>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-card">
          <Label>Your leagues</Label>
          {leagues.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {leagues.map((l) => (
                <Link key={l.code} href={`/leagues/${l.code}`} className="flex justify-between text-sm">
                  <span className="font-extrabold">{l.name}</span>
                  <span className="font-bold text-slate-500">#{l.yourRank} of {l.memberCount}</span>
                </Link>
              ))}
            </div>
          ) : (
            <Link href="/leagues" className="text-sm font-bold text-green-600">＋ Create or join a league</Link>
          )}
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-card">
          <Label>Recent proof</Label>
          {receipt ? (
            <Link href={`/r/${receipt.pickId}`} className="inline-block rounded-full bg-green-100 px-2.5 py-1 text-xs font-black text-green-800">
              ✓ O2.5 {receipt.result} +{formatPoints(receipt.points)}
            </Link>
          ) : (
            <p className="text-sm text-slate-500">Make a pick to earn your first verified receipt</p>
          )}
        </section>
      </div>
    </div>
  );
}
