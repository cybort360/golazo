import type { Match, Market } from "@/lib/predict/types";

export function buildMarkets(match: Match): Market[] {
  return [
    {
      id: "winner",
      title: "Match winner",
      question: null,
      hero: false,
      options: [
        { id: match.home.ticker, label: match.home.ticker },
        { id: "draw", label: "Draw" },
        { id: match.away.ticker, label: match.away.ticker },
      ],
    },
    {
      id: "totals",
      title: "Total goals · 2.5",
      question: null,
      hero: false,
      options: [
        { id: "over", label: "Over 2.5" },
        { id: "under", label: "Under 2.5" },
      ],
    },
    {
      id: "btts",
      title: "Both teams to score",
      question: null,
      hero: false,
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
    {
      id: "chaos",
      title: "Chaos Pick",
      question: "Goal after the 80th minute?",
      hero: true,
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
  ];
}
