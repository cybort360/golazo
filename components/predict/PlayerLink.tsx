import Link from "next/link";
import type { ReactNode } from "react";

// Wraps a player's name so it links to their public profile (/u/<handle>) when a
// handle is known; otherwise renders plain text (mock/empty rows).
export default function PlayerLink({
  handle,
  className,
  children,
}: {
  handle?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!handle) return <span className={className}>{children}</span>;
  return (
    <Link href={`/u/${handle}`} className={(className ? className + " " : "") + "hover:underline"}>
      {children}
    </Link>
  );
}
