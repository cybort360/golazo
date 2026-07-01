"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, SoccerBall, ListChecks, Trophy, Gift, Receipt } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

// Mobile bottom tab bar.
const ITEMS: { href: string; Icon: Icon; label: string }[] = [
  { href: "/", Icon: House, label: "Home" },
  { href: "/matches", Icon: SoccerBall, label: "Matches" },
  { href: "/picks", Icon: ListChecks, label: "Picks" },
  { href: "/leagues", Icon: Trophy, label: "Leagues" },
  { href: "/pools", Icon: Gift, label: "Pools" },
  { href: "/receipts", Icon: Receipt, label: "Receipts" },
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
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition-all " +
                  (on ? "bg-ink text-neon" : "text-slate-500")
                }
              >
                <it.Icon size={22} weight={on ? "fill" : "regular"} />
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
