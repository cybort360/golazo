"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";

// Shares a URL via the Web Share API where available, otherwise copies it to the
// clipboard. The path is resolved against the current origin at click time so it
// works in any environment without hard-coding a domain.
export default function ShareButton({
  path,
  title,
  text,
  className,
  label = "Share profile",
}: {
  path: string;
  title: string;
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // user dismissed the share sheet, or permissions denied — no-op
    }
  }

  return (
    <button type="button" onClick={onShare} className={className}>
      {copied ? <span className="inline-flex items-center gap-1"><Check weight="bold" size={14} /> Link copied</span> : label}
    </button>
  );
}
