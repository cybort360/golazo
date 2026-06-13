import Link from "next/link";
import type { Metadata } from "next";
import { kv } from "@vercel/kv";
import type { MatchResult } from "@/hooks/useMatchResults";

export const dynamic = "force-dynamic";

async function loadResult(matchId: string): Promise<MatchResult | null> {
  try {
    const results = (await kv.get<MatchResult[]>("match_results")) ?? [];
    return results.find((r) => r.matchId === matchId) ?? null;
  } catch {
    return null;
  }
}

function line(r: MatchResult | null): string {
  if (!r) return "World Cup 2026 on Golazo";
  const score =
    r.goalsWinner != null && r.goalsLoser != null
      ? ` ${r.goalsWinner}–${r.goalsLoser} `
      : " vs ";
  return `${r.winner}${score}${r.loser}`;
}

export async function generateMetadata({
  params,
}: {
  params: { matchId: string };
}): Promise<Metadata> {
  const r = await loadResult(params.matchId);
  return {
    title: `${line(r)} · Golazo`,
    description: r
      ? r.isDraw
        ? "Full time — a draw at the 2026 World Cup."
        : `Full time — $${r.winner} wins. Hold the winner's token on Golazo.`
      : "Live scores, buybacks, and a SOL prize pool on Golazo.",
  };
}

export default async function Page({
  params,
}: {
  params: { matchId: string };
}) {
  const r = await loadResult(params.matchId);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="text-xs font-bold uppercase tracking-widest text-green-600">
        Full Time
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">{line(r)}</h1>
      {r && !r.isDraw && (
        <p className="text-lg text-slate-600">${r.winner} takes it.</p>
      )}
      <Link
        href="/predict"
        className="mt-2 inline-flex items-center rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Predict the next match
      </Link>
    </div>
  );
}
