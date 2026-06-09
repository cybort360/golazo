"use client";

import { useEffect, useState } from "react";
import { toLocalTime } from "@/lib/time";

// Renders a fixture's kickoff time in the viewer's local timezone (e.g.
// "15:00 BST"). Computed after mount so the value is client-only, with
// suppressHydrationWarning so SSR/CSR never mismatch. Until then it shows the
// raw time without the " ET" suffix.
export function LocalTime({
  date,
  time,
  className,
}: {
  date: string;
  time: string;
  className?: string;
}) {
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    setLocal(toLocalTime(date, time));
  }, [date, time]);

  return (
    <span suppressHydrationWarning className={className}>
      {local ?? time.replace(/\s*ET$/i, "")}
    </span>
  );
}
