"use client";

import { useState } from "react";

// A button for not-yet-built features (e.g. prize pools have no backend). Clicking
// flashes "Coming soon" so it gives honest feedback instead of doing nothing.
export default function SoonButton({ className, label }: { className?: string; label: string }) {
  const [hit, setHit] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        setHit(true);
        setTimeout(() => setHit(false), 1600);
      }}
    >
      {hit ? "Coming soon" : label}
    </button>
  );
}
