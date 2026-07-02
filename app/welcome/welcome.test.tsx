import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WelcomePage from "@/app/welcome/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("WelcomePage", () => {
  it("offers all three entry points: guest, create account, and log in", () => {
    render(<WelcomePage />);
    // Play as guest (mints a ghost via the API on click).
    expect(screen.getByRole("button", { name: /play as guest/i })).toBeInTheDocument();
    // Create account → /signup.
    expect(screen.getByRole("link", { name: /create your account/i })).toHaveAttribute("href", "/signup");
    // At least one Log in entry points at /login.
    const logins = screen.getAllByRole("link", { name: /log in/i });
    expect(logins.length).toBeGreaterThan(0);
    expect(logins.every((a) => a.getAttribute("href") === "/login")).toBe(true);
  });
});
