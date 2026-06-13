import { ImageResponse } from "next/og";
import { kv } from "@vercel/kv";
import { ogFrame, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/ogCard";
import type { MatchResult } from "@/hooks/useMatchResults";

export const alt = "Golazo match result";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

async function loadResult(matchId: string): Promise<MatchResult | null> {
  try {
    const results = (await kv.get<MatchResult[]>("match_results")) ?? [];
    return results.find((r) => r.matchId === matchId) ?? null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: { matchId: string };
}) {
  const result = await loadResult(params.matchId);

  const score =
    result && result.goalsWinner != null && result.goalsLoser != null
      ? `${result.goalsWinner}–${result.goalsLoser}`
      : "";
  const headline = result
    ? `${result.winner} ${score} ${result.loser}`.replace(/\s+/g, " ").trim()
    : "World Cup 2026";
  const sub = !result
    ? "Live scores, burns & a SOL prize pool"
    : result.isDraw
      ? "Full time — Draw"
      : `$${result.winner} takes it`;

  return new ImageResponse(
    ogFrame(
      "FULL TIME",
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
          {headline}
        </div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 600, marginTop: 14 }}>
          {sub}
        </div>
      </div>,
    ),
    { ...size },
  );
}
