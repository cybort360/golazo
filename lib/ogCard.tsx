// Shared frame for the shareable OG cards (1200×630), matching the existing
// token OG: green gradient, GOLAZO wordmark, a top-right badge, and a footer.
// Body content is supplied per card. Inline styles only — required by next/og
// (satori); divs with multiple children set display:flex explicitly.

import type { ReactNode, ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export function ogFrame(badge: string, body: ReactNode): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "white",
        background: "linear-gradient(135deg, #166534 0%, #16a34a 100%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* header: wordmark + badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 40,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>
            GOLAZO
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {badge}
        </div>
      </div>

      {body}

      {/* footer */}
      <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.9)" }}>
        golazo.fun · Predict & win SOL
      </div>
    </div>
  );
}
