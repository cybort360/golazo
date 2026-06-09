import type { Metadata } from "next";
import { TEAMS } from "@/constants/teams";

// Token addresses are KV-driven, so never statically generate this segment at
// build time (which would bake in the static/null defaults).
export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
}: {
  params: { ticker: string };
}): Metadata {
  const ticker = params.ticker.toUpperCase();
  const team = TEAMS.find((t) => t.ticker === ticker);
  const name = team?.name ?? ticker;
  const title = `${name} ($${ticker})`;
  const description = `Trade the ${name} World Cup 2026 token on Solana. Champion holders split the prize pool.`;

  return {
    title,
    description,
    openGraph: { title: `${title} · Golazo`, description, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} · Golazo`, description },
  };
}

export default function TokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
