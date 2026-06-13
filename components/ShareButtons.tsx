"use client";

import { useState } from "react";
import { buildTweetIntent } from "@/lib/share";
import { Icon } from "@/components/Icon";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/**
 * "Share on X" + copy-link. `path` is the share page (e.g. /s/predictor/bob);
 * the absolute URL is built from NEXT_PUBLIC_SITE_URL, falling back to the
 * current origin so it still works on preview deploys / locally.
 */
export default function ShareButtons({
  text,
  path,
}: {
  text: string;
  path: string;
}) {
  const [copied, setCopied] = useState(false);

  const absoluteUrl = (): string => {
    const base =
      SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}${path}`;
  };

  const shareToX = () => {
    window.open(buildTweetIntent(text, absoluteUrl()), "_blank", "noopener");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={shareToX}
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Share on X
      </button>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Icon name={copied ? "check" : "copy"} size={13} />
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
