import type { CSSProperties } from "react";

// Flat vector flag (flag-icons). Sized via font-size (em-based, like the .fi class),
// so existing text-size utilities scale it. `code` is a flag-icons code
// (ISO 3166-1 alpha-2, or "gb-eng" / "gb-sct" for England / Scotland).
export function Flag({
  code,
  className = "",
  style,
}: {
  code: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  if (!code) {
    return (
      <span
        aria-hidden
        className={`inline-block w-[1.333em] rounded-[0.15em] bg-white/15 ${className}`}
        style={{ aspectRatio: "4 / 3", ...style }}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={`${code} flag`}
      className={`fi fi-${code} rounded-[0.15em] ${className}`}
      style={style}
    />
  );
}
