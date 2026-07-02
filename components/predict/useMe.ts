"use client";

import { useEffect, useState } from "react";

// The real current player (ghost or converted). Backs the nav/header identity so
// a new visitor never sees a stale persona. Cached per mount; cheap endpoint.
export interface Me {
  handle: string | null;
  name: string;
  initials: string;
  profileHref: string;
  isGhost: boolean;
}

// `enabled` guards the fetch: /api/predict/me calls ensureUser(), which MINTS a
// ghost. On landing/auth pages identity must stay a deliberate choice, so callers
// there pass enabled=false to avoid creating a ghost just by rendering the nav.
export function useMe(enabled = true): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void fetch("/api/predict/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d?.ok) setMe(d.me as Me);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled]);
  return me;
}
