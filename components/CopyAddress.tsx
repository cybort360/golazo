"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

// Shows the full (never truncated) address in monospace with a copy button.
// On click it copies and shows a "Copied!" confirmation for 2 seconds.
export default function CopyAddress({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    // Don't trigger any clickable parent (e.g. a row link).
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable, ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Address copied" : "Copy contract address"}
      className={cx(
        "group flex items-start gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-left font-mono text-xs text-slate-600 transition-colors hover:bg-slate-50",
        className,
      )}
    >
      <span className="min-w-0 flex-1 break-all">{address}</span>
      {copied ? (
        <span className="inline-flex shrink-0 items-center gap-1 font-sans font-semibold text-green-600">
          <Icon name="check" size={13} strokeWidth={2.5} />
          Copied!
        </span>
      ) : (
        <Icon
          name="copy"
          size={14}
          className="mt-px shrink-0 text-slate-400 group-hover:text-slate-600"
        />
      )}
    </button>
  );
}
