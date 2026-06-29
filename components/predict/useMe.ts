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

export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
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
  }, []);
  return me;
}
