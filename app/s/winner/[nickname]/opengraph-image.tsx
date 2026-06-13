import { ImageResponse } from "next/og";
import { getCachedLeaderboards, currentWeekKeyEt } from "@/lib/predictionStore";
import { predictorCardData, isWeekWinner } from "@/lib/share";
import { ogFrame, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/ogCard";

export const alt = "Golazo weekly winner";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: { nickname: string };
}) {
  const nickname = decodeURIComponent(params.nickname);
  const lb = await getCachedLeaderboards();
  const weekKey = currentWeekKeyEt();
  const won = isWeekWinner(lb, weekKey, nickname);
  const card = predictorCardData(lb, weekKey, nickname);

  const headline = won ? "Won the weekly\nSOL bounty" : "Climbing the board";
  const sub = card ? `${card.correct}/${card.played} correct` : "Predict & win SOL";

  return new ImageResponse(
    ogFrame(
      won ? "WEEKLY WINNER" : "PREDICT & WIN",
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.8)" }}>
          {card?.nickname ?? nickname}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            whiteSpace: "pre-wrap",
          }}
        >
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
