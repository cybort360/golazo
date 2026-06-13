import Link from "next/link";
import type { Metadata } from "next";
import { getCachedLeaderboards, currentWeekKeyEt } from "@/lib/predictionStore";
import { isWeekWinner, predictorCardData } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { nickname: string };
}): Promise<Metadata> {
  const nickname = decodeURIComponent(params.nickname);
  return {
    title: `${nickname} · Golazo weekly winner`,
    description: `${nickname} topped the weekly prediction board on Golazo. Think you can beat it?`,
  };
}

export default async function Page({
  params,
}: {
  params: { nickname: string };
}) {
  const nickname = decodeURIComponent(params.nickname);
  const lb = await getCachedLeaderboards();
  const weekKey = currentWeekKeyEt();
  const won = isWeekWinner(lb, weekKey, nickname);
  const card = predictorCardData(lb, weekKey, nickname);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
        {won ? "Weekly Winner 🏆" : "Predict & Win"}
      </span>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{nickname}</h1>
      <p className="text-lg text-slate-600">
        {won
          ? "won this week's SOL bounty on Golazo."
          : "is climbing the Golazo prediction board."}
        {card ? ` ${card.correct}/${card.played} correct.` : ""}
      </p>
      <Link
        href="/predict"
        className="mt-2 inline-flex items-center rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Think you can beat it?
      </Link>
    </div>
  );
}
