import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProofReceipt from "@/components/predict/ProofReceipt";
import { FIXTURE_RECEIPT } from "@/lib/predict/mockData";

describe("ProofReceipt", () => {
  it("shows the simple fan card by default", () => {
    render(<ProofReceipt receipt={FIXTURE_RECEIPT} />);
    expect(screen.getByText("WON")).toBeInTheDocument();
    expect(screen.getByText("+120 pts")).toBeInTheDocument();
    expect(screen.getByText(/Verified by/)).toBeInTheDocument();
    expect(screen.queryByText("Fixture ID")).not.toBeInTheDocument();
  });
  it("reveals advanced proof on toggle", () => {
    render(<ProofReceipt receipt={FIXTURE_RECEIPT} />);
    fireEvent.click(screen.getByRole("button", { name: /advanced proof/i }));
    expect(screen.getByText("Fixture ID")).toBeInTheDocument();
    expect(screen.getByText("wc26_GM041")).toBeInTheDocument();
  });
  it("hides optional rows when null", () => {
    render(<ProofReceipt receipt={{ ...FIXTURE_RECEIPT, txUrl: null }} />);
    fireEvent.click(screen.getByRole("button", { name: /advanced proof/i }));
    expect(screen.queryByText("Transaction")).not.toBeInTheDocument();
  });
});
