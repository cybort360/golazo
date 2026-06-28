import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchPickScreen from "@/components/predict/MatchPickScreen";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

describe("MatchPickScreen", () => {
  it("shows the matchup, all four markets, and the ghost line", () => {
    render(<MatchPickScreen match={FIXTURE_MATCH} />);
    expect(screen.getByText("Match winner")).toBeInTheDocument();
    expect(screen.getByText("Total goals · 2.5")).toBeInTheDocument();
    expect(screen.getByText("Both teams to score")).toBeInTheDocument();
    expect(screen.getByText("Chaos Pick")).toBeInTheDocument();
    expect(screen.getByText(/no signup needed/i)).toBeInTheDocument();
  });
  it("counts picks in the lock button as they are made", () => {
    render(<MatchPickScreen match={FIXTURE_MATCH} />);
    expect(screen.getByRole("button", { name: /lock my 0 picks/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ARG" }));
    expect(screen.getByRole("button", { name: /lock my 1 pick/i })).toBeInTheDocument();
  });
});
