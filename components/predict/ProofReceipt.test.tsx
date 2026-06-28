import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProofReceipt from "@/components/predict/ProofReceipt";
import { FIXTURE_RECEIPT } from "@/lib/predict/mockData";

describe("ProofReceipt", () => {
  it("shows the simple fan card by default", () => {
    render(<ProofReceipt receipt={FIXTURE_RECEIPT} />);
    expect(screen.getByText("WON")).toBeInTheDocument();
    expect(screen.getByText("+50")).toBeInTheDocument();
    expect(screen.getByText(/Verified by/)).toBeInTheDocument();
    expect(screen.queryByText("match_id")).not.toBeInTheDocument();
  });
  it("reveals advanced proof on toggle", () => {
    render(<ProofReceipt receipt={FIXTURE_RECEIPT} />);
    fireEvent.click(screen.getByRole("button", { name: /Advanced/i }));
    expect(screen.getByText("match_id")).toBeInTheDocument();
    expect(screen.getByText("TXL-31-ABLRVR")).toBeInTheDocument();
  });
  it("hides optional transaction row when null", () => {
    render(<ProofReceipt receipt={{ ...FIXTURE_RECEIPT, txUrl: null }} />);
    fireEvent.click(screen.getByRole("button", { name: /Advanced/i }));
    expect(screen.queryByText("transaction")).not.toBeInTheDocument();
  });
});
