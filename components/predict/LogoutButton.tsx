"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";

// Ends the current session (account or guest) and returns to /welcome.
export default function LogoutButton({ className, label = "Log out" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore — navigate away regardless */
    }
    // Hard navigation so all client state (identity, boards) resets cleanly.
    window.location.href = "/welcome";
  }
  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      <span className="inline-flex items-center justify-center gap-1.5">
        <SignOut size={13} /> {busy ? "Logging out…" : label}
      </span>
    </button>
  );
}
