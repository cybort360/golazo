"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/components/predict/useMe";
import ConvertDialog from "@/components/predict/ConvertDialog";
import LogoutButton from "@/components/predict/LogoutButton";
import {
  House,
  SoccerBall,
  ListChecks,
  Trophy,
  Ranking,
  Gift,
  Receipt,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

// Persistent desktop sidebar (canvas "Desktop layouts"). Hidden below lg, where
// the top SiteNav takes over.
const ITEMS: { href: string; label: string; Icon: Icon }[] = [
  { href: "/", label: "Home", Icon: House },
  { href: "/matches", label: "Matches", Icon: SoccerBall },
  { href: "/picks", label: "My picks", Icon: ListChecks },
  { href: "/leagues", label: "My leagues", Icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", Icon: Ranking },
  { href: "/pools", label: "Prize pools", Icon: Gift },
  { href: "/receipts", label: "Receipts", Icon: Receipt },
  { href: "/wallet", label: "Wallet", Icon: Wallet },
];

const BARE = ["/welcome", "/login", "/signup"];

export default function SideNav() {
  const pathname = usePathname();
  const hidden =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/tg") ||
    BARE.some((p) => pathname === p || pathname?.startsWith(p + "/"));
  const me = useMe(!hidden);
  if (hidden) return null;

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
                  ? "flex items-center gap-2.5 rounded-[11px] bg-[#171717] px-3.5 py-3 text-sm font-extrabold text-neon"
                  : "flex items-center gap-2.5 rounded-[11px] px-3.5 py-3 text-sm font-bold text-slate-400 transition-colors hover:text-white"
              }
            >
              <it.Icon size={18} weight={on ? "fill" : "regular"} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-[13px] border border-[#262626] bg-[#171717] p-3.5">
        <Link href={me?.profileHref ?? "/leagues"} className="block">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
            {me?.isGhost === false ? "Playing as" : "Guest"}
          </div>
          <div className="mt-1 flex items-center justify-between text-sm font-extrabold">
            {me?.name ?? "…"} <span className="text-slate-500">›</span>
          </div>
        </Link>
        {me?.isGhost === false ? (
          <>
            <ConvertDialog
              className="mt-2.5 w-full rounded-[9px] bg-neon py-2 text-center text-xs font-extrabold text-ink"
              label="Edit profile"
            />
            <LogoutButton className="mt-2 w-full rounded-[9px] border border-[#333] py-2 text-center text-xs font-bold text-slate-400 transition-colors hover:text-white" />
          </>
        ) : (
          <>
            <Link
              href="/signup"
              className="mt-2.5 block w-full rounded-[9px] bg-neon py-2 text-center text-xs font-extrabold text-ink"
            >
              Create account
            </Link>
            <p className="mt-2 text-center text-[10px] font-semibold leading-tight text-slate-500">
              Save your picks across devices
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
