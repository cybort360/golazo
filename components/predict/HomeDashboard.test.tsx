import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeDashboard from "@/components/predict/HomeDashboard";
import { FIXTURE_MATCH, FIXTURE_LEAGUE, FIXTURE_RECEIPT } from "@/lib/predict/mockData";

describe("HomeDashboard", () => {
  it("shows the tagline and populated sections", () => {
    render(<HomeDashboard matches={[FIXTURE_MATCH]} leagues={[FIXTURE_LEAGUE]} receipts={[FIXTURE_RECEIPT]} />);
    expect(screen.getByText(/Prove you/i)).toBeInTheDocument();
    expect(screen.getByText("Sunday League")).toBeInTheDocument();
    expect(screen.getByText(/Over 2\.5 Goals/)).toBeInTheDocument();
    expect(screen.getByText(/WON/)).toBeInTheDocument();
    expect(screen.getByText(/\+50/)).toBeInTheDocument();
  });
  it("shows empty prompts for a first-time visitor", () => {
    render(<HomeDashboard matches={[]} leagues={[]} receipts={[]} />);
    expect(screen.getByText(/Create or join a league/i)).toBeInTheDocument();
    expect(screen.getByText(/Make a pick to earn/i)).toBeInTheDocument();
  });
});
