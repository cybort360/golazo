"use client";

import Link from "next/link";
import { useMe } from "@/components/predict/useMe";

// Real current-player avatar chip used in headers. Links to the player's own
// profile and shows their initials — never a hardcoded persona.
export default function MeAvatar({ className }: { className?: string }) {
  const me = useMe();
  return (
    <Link href={me?.profileHref ?? "/leagues"} aria-label="Your profile" className={className}>
      {me?.initials ?? "··"}
    </Link>
  );
}
