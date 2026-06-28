import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GlobalLeaderboard from "@/components/predict/GlobalLeaderboard";
import { FIXTURE_GLOBAL } from "@/lib/predict/mockData";

describe("GlobalLeaderboard", () => {
  it("renders the global title, total players, and the user's rank", () => {
    render(<GlobalLeaderboard board={FIXTURE_GLOBAL} />);
    expect(screen.getByText("Global leaderboard")).toBeInTheDocument();
    expect(screen.getByText(/8,432 players worldwide/)).toBeInTheDocument();
    expect(screen.getByText("#142")).toBeInTheDocument();
  });
  it("shows top players and pins the you row when outside the top", () => {
    render(<GlobalLeaderboard board={FIXTURE_GLOBAL} />);
    expect(screen.getByText("xG_Wizard")).toBeInTheDocument();
    expect(screen.getByText(/Your standing/i)).toBeInTheDocument();
    const you = screen.getByTestId("grow-jk");
    expect(you).toHaveAttribute("data-you", "true");
  });
});
