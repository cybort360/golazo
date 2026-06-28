"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { openIntro } from "@/components/IntroModal";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/leagues", label: "Leagues" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

function NavLinks({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-slate-100/70 p-1">
      {LINKS.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cx(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
              active ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/tg")) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md lg:hidden">
      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <div className="flex h-14 items-center justify-between gap-3 md:h-16">
          <Link href="/" className="group inline-flex shrink-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-neon shadow-sm transition-transform group-hover:scale-105">
              <Icon name="football" size={18} strokeWidth={2} />
            </span>
            <span className="text-base font-black tracking-tight text-slate-900 sm:text-lg">Golazo</span>
          </Link>

          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-16 items-center justify-center md:flex">
            <div className="pointer-events-auto"><NavLinks pathname={pathname} /></div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={openIntro}
              aria-label="How it works"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon name="help" size={16} />
              <span className="hidden sm:inline">How it works</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center pb-2.5 md:hidden"><NavLinks pathname={pathname} /></div>
      </div>
    </nav>
  );
}
