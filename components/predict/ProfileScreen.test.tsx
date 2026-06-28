import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileScreen from "@/components/predict/ProfileScreen";
import { buildProfile } from "@/lib/predict/profile";
import { FIXTURE_RECEIPT, FIXTURE_GLOBAL_YOU } from "@/lib/predict/mockData";

const profile = buildProfile([FIXTURE_RECEIPT], {
  handle: "jordan", displayName: "Jordan", initials: "JK", color: "#1e293b",
  tagline: "Prove you know ball.", globalRank: FIXTURE_GLOBAL_YOU.rank,
});

describe("ProfileScreen", () => {
  it("renders identity, global rank and headline stats", () => {
    render(<ProfileScreen profile={profile} />);
    expect(screen.getByText("Jordan")).toBeInTheDocument();
    expect(screen.getByText(/@jordan/)).toBeInTheDocument();
    expect(screen.getByText("#142")).toBeInTheDocument();
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
  });
  it("offers a share action", () => {
    render(<ProfileScreen profile={profile} />);
    expect(screen.getByRole("button", { name: /share my profile/i })).toBeInTheDocument();
  });
});
