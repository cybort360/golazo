import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WalletPanel from "@/components/predict/WalletPanel";
import { FIXTURE_WALLET } from "@/lib/predict/mockData";

describe("WalletPanel", () => {
  it("shows the connect CTA when disconnected and reveals the address after connecting", () => {
    render(<WalletPanel wallet={FIXTURE_WALLET} />);
    const connect = screen.getByRole("button", { name: /connect wallet \(preview\)/i });
    expect(connect).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^claim/i })).not.toBeInTheDocument();

    fireEvent.click(connect);
    expect(screen.getByText(/Disconnect/)).toBeInTheDocument();
    // claimable rewards become claimable once connected
    expect(screen.getAllByRole("button", { name: /claim/i }).length).toBeGreaterThan(0);
  });

  it("marks a reward claimed in the preview when claimed", () => {
    render(<WalletPanel wallet={FIXTURE_WALLET} />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet \(preview\)/i }));
    const claim = screen.getAllByRole("button", { name: /claim/i })[0];
    fireEvent.click(claim);
    expect(screen.getByText(/Claimed/)).toBeInTheDocument();
  });

  it("gates the experience when the region is not eligible", () => {
    render(<WalletPanel wallet={{ ...FIXTURE_WALLET, eligibleRegion: false }} />);
    expect(screen.getByText(/Not available in your region/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
  });
});
