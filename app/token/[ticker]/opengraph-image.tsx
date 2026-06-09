import { ImageResponse } from "next/og";
import { kv } from "@vercel/kv";
import { TEAMS } from "@/constants/teams";

export const alt = "Golazo team token";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Shape stored under the `token_addresses` KV key by the admin panel.
interface TokenOverride {
  address: string;
  pumpUrl: string;
}

/** Empty / whitespace-only strings mean "not set" → null. */
function clean(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve a ticker's mint, merging any admin-set address (KV) over the static
 * default — same merge as /api/tokens. Degrades to the static value if KV is
 * unavailable.
 */
async function resolveAddress(
  ticker: string,
  staticAddress: string | null,
): Promise<string | null> {
  try {
    const overrides =
      (await kv.get<Record<string, TokenOverride>>("token_addresses")) ?? {};
    const o = overrides[ticker];
    if (o) return clean(o.address);
  } catch {
    // KV unavailable — fall through to the static default.
  }
  return staticAddress;
}

interface OgPrice {
  priceUsd: string | null;
  change: number | null;
}

async function fetchPrice(address: string | null): Promise<OgPrice | null> {
  if (!address) return null;
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{
        priceUsd?: string;
        priceChange?: { h24?: number };
      }> | null;
    };
    const pair = Array.isArray(data.pairs) ? data.pairs[0] : null;
    if (!pair) return null;
    return {
      priceUsd: pair.priceUsd ?? null,
      change: pair.priceChange?.h24 ?? null,
    };
  } catch {
    return null;
  }
}

function formatPrice(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toFixed(8).replace(/0+$/, "")}`;
  return "$0.00";
}

export default async function Image({
  params,
}: {
  params: { ticker: string };
}) {
  const ticker = params.ticker.toUpperCase();
  const team = TEAMS.find((t) => t.ticker === ticker);
  const name = team?.name ?? ticker;
  const address = await resolveAddress(ticker, team?.tokenAddress ?? null);
  const price = await fetchPrice(address);
  const up = price?.change != null && price.change >= 0;

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
        <div
          style={{
            position: "absolute",
            left: 600,
            top: 0,
            width: 2,
            height: 630,
            background: "rgba(255,255,255,0.16)",
          }}
        />

        {/* wordmark */}
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

        {/* team + price */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.8)" }}
          >
            {`$${ticker}`}
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            {name}
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 18 }}
          >
            <div style={{ fontSize: 64, fontWeight: 700 }}>
              {price?.priceUsd ? formatPrice(price.priceUsd) : "Launching soon"}
            </div>
            {price?.change != null && (
              <div
                style={{
                  display: "flex",
                  fontSize: 32,
                  fontWeight: 700,
                  padding: "8px 20px",
                  borderRadius: 999,
                  background: "white",
                  color: up ? "#16a34a" : "#ef4444",
                }}
              >
                {up ? "+" : ""}
                {price.change.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.9)" }}>
          {`Trade the ${name} World Cup 2026 token · Champion holders split the prize pool`}
        </div>
      </div>
    ),
    { ...size },
  );
}
