import { ImageResponse } from "next/og";
import { getReceiptById } from "@/lib/predict/receipt";
import { formatPoints } from "@/lib/predict/labels";

export const runtime = "nodejs";
export const alt = "Golazo verified pick";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded, per-receipt share card (P2-13) — the rich preview Telegram/Discord
// unfurl when a verified pick link is shared. Ink + neon lime, big result word.
export default async function Image({ params }: { params: { pickId: string } }) {
  const r = await getReceiptById(params.pickId);

  const result = r?.result ?? "VERIFIED";
  const won = result === "WON";
  const resultColor = won ? "#d4ff3f" : result === "LOST" ? "#f87171" : "#cbd5e1";
  const label = r?.predictionLabel ?? "Prove you know ball.";
  const score = r ? `${r.home.name} ${r.homeScore}–${r.awayScore} ${r.away.name}` : "";
  const points = r && r.points > 0 ? `+${formatPoints(r.points)} pts` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "white",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: 80, top: 80, width: 320, height: 320, borderRadius: 320, border: "2px solid rgba(212,255,63,0.18)" }} />

        {/* wordmark + verified */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 44, background: "#d4ff3f", display: "flex" }} />
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, color: "#d4ff3f" }}>GOLAZO</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 22px",
              borderRadius: 999,
              border: "1px solid rgba(22,163,74,0.5)",
              background: "rgba(22,163,74,0.16)",
              color: "#4ade80",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            ✓ VERIFIED
          </div>
        </div>

        {/* prediction + result */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 3 }}>
            {r ? "Your prediction" : ""}
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>{label}</div>
          <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -6, lineHeight: 1, color: resultColor }}>{result}</div>
        </div>

        {/* footer: score + points + attribution */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {score && <div style={{ fontSize: 34, fontWeight: 700 }}>{score}</div>}
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.55)" }}>Verified by TxLINE</div>
          </div>
          {points && <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, color: "#d4ff3f" }}>{points}</div>}
        </div>
      </div>
    ),
    { ...size },
  );
}
