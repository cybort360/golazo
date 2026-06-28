"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Persistent desktop sidebar (canvas "Desktop layouts"). Hidden below lg, where
// the top SiteNav takes over.
const ITEMS = [
  { href: "/", label: "Home", icon: "⚡" },
  { href: "/matches", label: "Matches", icon: null },
  { href: "/leagues", label: "My leagues", icon: null },
  { href: "/r/9f3a", label: "Receipts", icon: null },
];

export default function SideNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/tg")) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] flex-col bg-ink px-4 py-6 text-white lg:flex">
      <div className="px-2 text-[22px] font-black tracking-[-0.04em]">GOLAZO</div>
      <nav className="mt-7 flex flex-col gap-1">
        {ITEMS.map((it) => {
          const on = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={
                on
                  ? "rounded-[11px] bg-[#171717] px-3.5 py-3 text-sm font-extrabold text-neon"
                  : "rounded-[11px] px-3.5 py-3 text-sm font-bold text-slate-400 transition-colors hover:text-white"
              }
            >
              {it.icon ? `${it.icon} ` : ""}{it.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-[13px] border border-[#262626] bg-[#171717] p-3.5">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Playing as</div>
        <div className="mt-1 text-sm font-extrabold">Guest · Jordan</div>
        <button
          type="button"
          className="mt-2.5 w-full rounded-[9px] bg-neon py-2 text-center text-xs font-extrabold text-ink"
        >
          Save my picks
        </button>
      </div>
    </aside>
  );
}
