import { ImageResponse } from "next/og";
import { getCachedLeaderboards, currentGameweekKey } from "@/lib/predictionStore";
import { predictorCardData } from "@/lib/share";
import { ogFrame, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/ogCard";

export const alt = "Golazo predictor standing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: { nickname: string };
}) {
  const nickname = decodeURIComponent(params.nickname);
  const lb = await getCachedLeaderboards();
  const card = predictorCardData(lb, currentGameweekKey(), nickname);

  const headline = card
    ? `#${card.rank} ${card.scope === "week" ? "this week" : "this season"}`
    : "Predicting the World Cup";
  const sub = card ? `${card.correct}/${card.played} correct` : "Call every match. Win SOL.";

  return new ImageResponse(
    ogFrame(
      "PREDICT & WIN",
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.8)" }}>
          {card?.nickname ?? nickname}
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
          {headline}
        </div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 600, marginTop: 16 }}>
          {sub}
        </div>
      </div>,
    ),
    { ...size },
  );
}
