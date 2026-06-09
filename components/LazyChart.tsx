"use client";

import { useEffect, useRef, useState } from "react";

// Defers the (heavy) DexScreener iframe until it scrolls near the viewport,
// so the rest of the token page paints fast.
export default function LazyChart({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
    >
      {show ? (
        <iframe
          title={title}
          src={src}
          loading="lazy"
          className="h-[400px] w-full"
        />
      ) : (
        <div className="flex h-[400px] items-center justify-center text-sm text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-green-500" />
            Loading chart…
          </span>
        </div>
      )}
    </div>
  );
}
