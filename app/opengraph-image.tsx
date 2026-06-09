import { ImageResponse } from "next/og";

export const alt = "Golazo: Football Token Trading on Solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card on a top-down pitch background.
export default function Image() {
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
          background: "linear-gradient(135deg, #166534 0%, #16a34a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* pitch markings */}
        <div
          style={{
            position: "absolute",
            left: 600,
            top: 0,
            width: 2,
            height: 630,
            background: "rgba(255,255,255,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 480,
            top: 195,
            width: 240,
            height: 240,
            borderRadius: 240,
            border: "2px solid rgba(255,255,255,0.18)",
          }}
        />

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 44,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            GOLAZO
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            World Cup Token Trading on Solana
          </div>
          <div style={{ fontSize: 32, color: "rgba(255,255,255,0.85)" }}>
            48 nations. One champion. Holders split the prize pool.
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontWeight: 600,
            }}
          >
            Live prize pool
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontWeight: 600,
            }}
          >
            On-chain buybacks
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
