"use client";

import { useEffect, useState } from "react";

// Live "kicks off in …" countdown to a match's kickoff. Ticks every second.
// Renders nothing until mounted so server/client first paint match (no hydration
// mismatch from Date.now()), then fills in.
export default function KickoffCountdown({
  kickoffMs,
  className,
  prefix = "Kicks off in ",
}: {
  kickoffMs: number;
  className?: string;
  prefix?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return <span className={className} />;

  const ms = kickoffMs - now;
  if (ms <= 0) return <span className={className}>Kicking off…</span>;

  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const secs = Math.floor((ms % 60_000) / 1000);

  const label =
    days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`;

  return (
    <span className={className}>
      {prefix}
      {label}
    </span>
  );
}
