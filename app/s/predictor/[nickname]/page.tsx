import Link from "next/link";
import type { Metadata } from "next";
import { getCachedLeaderboards, currentWeekKeyEt } from "@/lib/predictionStore";
import { predictorCardData } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { nickname: string };
}): Promise<Metadata> {
  const nickname = decodeURIComponent(params.nickname);
  return {
    title: `${nickname} · Golazo predictions`,
    description: `${nickname} is calling the 2026 World Cup on Golazo. Predict every match and win SOL.`,
  };
}

export default async function Page({
  params,
}: {
  params: { nickname: string };
}) {
  const nickname = decodeURIComponent(params.nickname);
  const card = predictorCardData(await getCachedLeaderboards(), currentWeekKeyEt(), nickname);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="text-xs font-bold uppercase tracking-widest text-green-600">
        Predict &amp; Win
      </span>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{nickname}</h1>
      <p className="text-lg text-slate-600">
        {card
          ? `#${card.rank} ${card.scope === "week" ? "this week" : "this season"} · ${card.correct}/${card.played} correct`
          : "is predicting the 2026 World Cup on Golazo."}
      </p>
      <Link
        href="/predict"
        className="mt-2 inline-flex items-center rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Play Predict &amp; Win
      </Link>
    </div>
  );
}
