import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchListItem from "@/components/predict/MatchListItem";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

describe("MatchListItem", () => {
  it("links to the match pick screen", () => {
    render(<MatchListItem match={FIXTURE_MATCH} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/match/ABLRVR");
    expect(screen.getByText(/ABL/)).toBeInTheDocument();
  });
});
