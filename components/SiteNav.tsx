"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { openIntro } from "@/components/IntroModal";

// Mobile/tablet top bar (hidden at lg, where the sidebar takes over). Nav links
// live in the bottom tab bar now — this keeps just the brand + "How it works".
export default function SiteNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/tg")) return null;

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="group inline-flex shrink-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-neon shadow-sm transition-transform group-hover:scale-105">
            <Icon name="football" size={18} strokeWidth={2} />
          </span>
          <span className="text-base font-black tracking-tight text-slate-900">Golazo</span>
        </Link>

        <button
          type="button"
          onClick={openIntro}
          aria-label="How it works"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon name="help" size={16} />
          <span>How it works</span>
        </button>
      </div>
    </nav>
  );
}
