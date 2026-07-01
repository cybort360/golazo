import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MyPicks from "@/components/predict/MyPicks";
import type { ActivePickGroup, Match } from "@/lib/predict/types";

const MATCH: Match = {
  id: "ARGBRA",
  competition: "World Cup",
  round: "Final",
  kickoffMs: Date.now() + 3_600_000,
  lockMs: Date.now() + 3_600_000,
  state: "NOT_STARTED",
  minute: null,
  phaseLabel: null,
  home: { ticker: "ARG", name: "Argentina", flagCode: "ar", color: "#6ca" },
  away: { ticker: "BRA", name: "Brazil", flagCode: "br", color: "#fc0" },
  homeScore: null,
  awayScore: null,
};

const GROUP: ActivePickGroup = {
  match: MATCH,
  picks: [
    { pickId: "p1", marketId: "winner", marketTitle: "Match winner", optionLabel: "Argentina", createdAtMs: 0 },
    { pickId: "p2", marketId: "totals", marketTitle: "Total goals · 2.5", optionLabel: "Over", createdAtMs: 0 },
  ],
};

describe("MyPicks", () => {
  it("renders each active pick with its match and options", () => {
    render(<MyPicks groups={[GROUP]} />);
    // "Argentina" appears twice: the matchup name and the winner-pick label.
    expect(screen.getAllByText("Argentina").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Brazil")).toBeInTheDocument();
    expect(screen.getByText("Match winner")).toBeInTheDocument();
    expect(screen.getByText("Over")).toBeInTheDocument();
    // active count in the banner
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows the empty state when there are no active picks", () => {
    render(<MyPicks groups={[]} />);
    expect(screen.getByText(/No active picks yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Make your first pick/i })).toBeInTheDocument();
  });
});
