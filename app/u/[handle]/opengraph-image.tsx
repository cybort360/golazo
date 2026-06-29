import { ImageResponse } from "next/og";
import { dataSource } from "@/lib/predict/dataSource";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";

export const alt = "Golazo player profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded, per-profile share card — ink + neon lime with headline stats.
export default async function Image({ params }: { params: { handle: string } }) {
  const profile = await dataSource.getProfile();
  const known = profile.handle === params.handle.toLowerCase();
  const name = known ? profile.displayName : "Golazo";
  const handle = known ? `@${profile.handle}` : "Prove you know ball.";

  const stats = known
    ? [
        { k: "Accuracy", v: formatAccuracy(profile.accuracy) },
        { k: "Streak", v: `${profile.currentStreak}` },
        { k: "Points", v: `+${formatPoints(profile.points)}` },
      ]
    : [];

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

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 44, background: "#d4ff3f", display: "flex" }} />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, color: "#d4ff3f" }}>GOLAZO</div>
        </div>

        {/* identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, lineHeight: 1.02 }}>{name}</div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)" }}>{handle}</div>
        </div>

        {/* stat chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30 }}>
          {stats.map((s) => (
            <div
              key={s.k}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "16px 28px",
                borderRadius: 20,
                background: "#171717",
                border: "1px solid rgba(212,255,63,0.25)",
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 800, color: "#d4ff3f" }}>{s.v}</div>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 2 }}>{s.k}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
