"use client";

import { useEffect, useState } from "react";
import type { MarketId } from "@/lib/predict/types";
import { isMarketId } from "@/lib/predict/pick-rules";

export interface ExistingPick {
  marketId: MarketId;
  optionId: string;
  optionLabel: string;
}

// Load the current user's already-made picks for a match, so the pick screen can
// reflect them (pre-select when still open, list them when locked). Returns [] on
// first render / no picks / error.
export function useExistingPicks(matchId: string): ExistingPick[] {
  const [existing, setExisting] = useState<ExistingPick[]>([]);
  useEffect(() => {
    let live = true;
    try {
      fetch(`/api/predict/pick?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!live || !d?.ok || !Array.isArray(d.picks)) return;
          setExisting(
            d.picks
              .filter((p: { marketId: string }) => isMarketId(p.marketId))
              .map((p: { marketId: MarketId; optionId: string; predictionLabel: string }) => ({
                marketId: p.marketId,
                optionId: p.optionId,
                optionLabel: p.predictionLabel,
              })),
          );
        })
        .catch(() => {});
    } catch {
      /* relative URL in non-browser env — ignore */
    }
    return () => {
      live = false;
    };
  }, [matchId]);
  return existing;
}
