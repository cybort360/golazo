import type { Match, Market } from "@/lib/predict/types";

// The four MVP markets for a match. Odds are illustrative (mock); real odds will
// come from the data source later. Order is fixed: winner, totals, btts, chaos.
export function buildMarkets(match: Match): Market[] {
  return [
    {
      id: "winner",
      title: "Match winner",
      question: null,
      subtitle: null,
      rewardBadge: null,
      hero: false,
      options: [
        { id: match.home.ticker, label: match.home.name, odds: "2.10" },
        { id: "draw", label: "Draw", odds: "3.30" },
        { id: match.away.ticker, label: match.away.name, odds: "3.60" },
      ],
    },
    {
      id: "totals",
      title: "Total goals · 2.5",
      question: null,
      subtitle: null,
      rewardBadge: null,
      hero: false,
      options: [
        { id: "over", label: "Over", odds: null },
        { id: "under", label: "Under", odds: null },
      ],
    },
    {
      id: "btts",
      title: "Both teams to score",
      question: null,
      subtitle: null,
      rewardBadge: null,
      hero: false,
      options: [
        { id: "yes", label: "Yes", odds: null },
        { id: "no", label: "No", odds: null },
      ],
    },
    {
      id: "chaos",
      title: "Chaos Pick",
      question: "Goal after the 80th minute?",
      subtitle: "High risk, high reward. The Golazo special.",
      rewardBadge: "2× POINTS",
      hero: true,
      options: [
        { id: "yes", label: "YES", odds: null },
        { id: "no", label: "NO", odds: null },
      ],
    },
  ];
}
