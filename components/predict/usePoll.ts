"use client";

import { useEffect, useRef, useState } from "react";

// Re-runs `fetcher` immediately and then every `ms` so live screens (matches,
// home, match detail) reflect score/minute/state changes without a manual
// reload. The fetcher is read through a ref so the interval isn't torn down on
// every render.
export function usePoll<T>(fetcher: () => Promise<T>, ms = 20000): T | null {
  const [data, setData] = useState<T | null>(null);
  const fref = useRef(fetcher);
  fref.current = fetcher;

  useEffect(() => {
    let live = true;
    const run = () =>
      fref.current()
        .then((d) => {
          if (live) setData(d);
        })
        .catch(() => {});
    void run();
    const id = setInterval(run, ms);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [ms]);

  return data;
}
