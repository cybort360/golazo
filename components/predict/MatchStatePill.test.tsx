import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchStatePill from "@/components/predict/MatchStatePill";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

describe("MatchStatePill", () => {
  it("shows the live minute", () => {
    render(<MatchStatePill match={FIXTURE_MATCH} />);
    expect(screen.getByText("LIVE 67'")).toBeInTheDocument();
  });
  it("renders nothing before kickoff", () => {
    const { container } = render(
      <MatchStatePill match={{ ...FIXTURE_MATCH, state: "NOT_STARTED" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
