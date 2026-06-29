import type { Match, Market, MarketId } from "@/lib/predict/types";

// Submit the user's selected picks to the API (one row per market). Shared by the
// mobile + desktop pick screens. Returns the first error (e.g. "picks are locked")
// so the UI can surface it. A ghost user is created server-side on first pick.
export async function submitPicks(
  match: Match,
  markets: Market[],
  picks: Partial<Record<MarketId, string>>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const chosen = markets
    .map((m) => ({ market: m, optionId: picks[m.id] }))
    .filter((x): x is { market: Market; optionId: string } => !!x.optionId);

  if (chosen.length === 0) return { ok: false, error: "Pick at least one market first" };

  try {
    for (const { market, optionId } of chosen) {
      const label = market.options.find((o) => o.id === optionId)?.label ?? `${market.id} · ${optionId}`;
      const r = await fetch("/api/predict/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, marketId: market.id, optionId, predictionLabel: label }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) return { ok: false, error: d?.error ?? `Couldn't save (${r.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error — try again" };
  }
}
