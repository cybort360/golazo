import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketPicker from "@/components/predict/MarketPicker";
import { buildMarkets } from "@/lib/predict/markets";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

const [winner, , , chaos] = buildMarkets(FIXTURE_MATCH);

describe("MarketPicker", () => {
  it("fires onSelect with the option id", () => {
    const onSelect = vi.fn();
    render(<MarketPicker market={winner} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Draw/ }));
    expect(onSelect).toHaveBeenCalledWith("draw");
  });
  it("marks the selected option pressed", () => {
    render(<MarketPicker market={winner} selected={FIXTURE_MATCH.home.ticker} onSelect={() => {}} />);
    expect(
      screen.getByRole("button", { name: new RegExp(FIXTURE_MATCH.home.name) }),
    ).toHaveAttribute("aria-pressed", "true");
  });
  it("shows the chaos question", () => {
    render(<MarketPicker market={chaos} selected={null} onSelect={() => {}} />);
    expect(screen.getByText("Goal after the 80th minute?")).toBeInTheDocument();
  });
});
