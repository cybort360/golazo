import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchPickScreen from "@/components/predict/MatchPickScreen";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";
import type { Match } from "@/lib/predict/types";

// FIXTURE_MATCH is LIVE (picks locked). Derive an open, not-yet-kicked-off match
// for the pick-flow tests.
const OPEN_MATCH: Match = {
  ...FIXTURE_MATCH,
  state: "NOT_STARTED",
  minute: null,
  phaseLabel: null,
  kickoffMs: Date.now() + 60 * 60_000,
  lockMs: Date.now() + 60 * 60_000,
};

describe("MatchPickScreen", () => {
  it("shows the matchup, all four markets, and the ghost line", () => {
    render(<MatchPickScreen match={OPEN_MATCH} />);
    expect(screen.getByText("Match winner")).toBeInTheDocument();
    expect(screen.getByText("Total goals · 2.5")).toBeInTheDocument();
    expect(screen.getByText("Both teams to score")).toBeInTheDocument();
    expect(screen.getByText("Goal after the 80th minute?")).toBeInTheDocument();
    expect(screen.getByText(/no signup needed/i)).toBeInTheDocument();
  });
  it("counts picks in the lock button as they are made", () => {
    render(<MatchPickScreen match={OPEN_MATCH} />);
    expect(screen.getByRole("button", { name: /Lock my picks · 0 selected/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(OPEN_MATCH.home.name) }));
    expect(screen.getByRole("button", { name: /Lock my picks · 1 selected/i })).toBeInTheDocument();
  });
  it("locks the pick flow once the match has kicked off", () => {
    render(<MatchPickScreen match={FIXTURE_MATCH} />); // LIVE
    expect(screen.getByText(/Picks locked/i)).toBeInTheDocument();
    expect(screen.getByText(/kicked off/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lock my picks/i })).not.toBeInTheDocument();
  });
});
