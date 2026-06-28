"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Mobile bottom tab bar. Emoji placeholders stand in for real icons for now.
const ITEMS = [
  { href: "/", emoji: "🏠", label: "Home" },
  { href: "/matches", emoji: "⚽", label: "Matches" },
  { href: "/leagues", emoji: "🏆", label: "Leagues" },
  { href: "/receipts", emoji: "🧾", label: "Receipts" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((it) => {
          const on = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={on ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2"
            >
              <span
                className={
                  "flex h-10 w-10 items-center justify-center rounded-2xl text-[21px] transition-all " +
                  (on ? "bg-ink" : "opacity-50")
                }
              >
                {it.emoji}
              </span>
              <span
                className={
                  "h-1 w-1 rounded-full transition-colors " + (on ? "bg-neon" : "bg-transparent")
                }
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
