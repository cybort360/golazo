import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LeagueLeaderboard from "@/components/predict/LeagueLeaderboard";
import { FIXTURE_LEAGUE } from "@/lib/predict/mockData";

describe("LeagueLeaderboard", () => {
  it("renders the invite code and the user's rank", () => {
    render(<LeagueLeaderboard league={FIXTURE_LEAGUE} />);
    expect(screen.getByText("GLZ-4F2K")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
  });
  it("highlights the you row and shows accuracy", () => {
    render(<LeagueLeaderboard league={FIXTURE_LEAGUE} />);
    const you = screen.getByTestId("row-jk");
    expect(you).toHaveAttribute("data-you", "true");
    expect(screen.getByText("76% acc · 🔥 3")).toBeInTheDocument();
  });
});
