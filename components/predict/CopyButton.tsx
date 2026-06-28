"use client";

import { useState } from "react";

// Copies arbitrary text to the clipboard with a transient "Copied" state.
export default function CopyButton({
  value,
  className,
  label = "Copy",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      // clipboard unavailable / denied — no-op
    }
  }

  return (
    <button type="button" onClick={onCopy} className={className}>
      {copied ? "✓ Copied" : label}
    </button>
  );
}
