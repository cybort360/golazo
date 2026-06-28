import { ImageResponse } from "next/og";

export const alt = "Golazo: Make picks. Prove you know ball. Verify every result.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card — ink + neon lime prediction-league framing.
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
          background: "#0a0a0a",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* decorative pitch-circle accent */}
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 80,
            width: 320,
            height: 320,
            borderRadius: 320,
            border: "2px solid rgba(212,255,63,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 140,
            top: 140,
            width: 200,
            height: 200,
            borderRadius: 200,
            border: "1px solid rgba(212,255,63,0.10)",
          }}
        />

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 44,
              background: "#d4ff3f",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, color: "#d4ff3f" }}>
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
            Make picks.{" "}
            <span style={{ color: "#d4ff3f" }}>Prove you know ball.</span>
          </div>
          <div style={{ fontSize: 32, color: "rgba(255,255,255,0.75)" }}>
            Pick matches. Get TxLINE-verified results. Climb private leagues.
          </div>
        </div>

        {/* footer chips */}
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
              background: "rgba(212,255,63,0.15)",
              border: "1px solid rgba(212,255,63,0.35)",
              fontWeight: 600,
              color: "#d4ff3f",
            }}
          >
            Private leagues
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(22,163,74,0.20)",
              border: "1px solid rgba(22,163,74,0.40)",
              fontWeight: 600,
              color: "#4ade80",
            }}
          >
            Verified results
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
