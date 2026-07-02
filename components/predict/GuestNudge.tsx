"use client";

import Link from "next/link";
import { useMe } from "@/components/predict/useMe";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";

// A gentle, persistent nudge shown only to guests: create an account to save
// picks across devices and unlock leagues, the leaderboard, and Market Mode.
// Renders nothing for real accounts (and while identity is still resolving).
export default function GuestNudge({ className }: { className?: string }) {
  const me = useMe();
  if (!me || me.isGhost === false) return null;
  return (
    <Link
      href="/signup"
      className={
        "flex items-center gap-3 rounded-2xl border border-neon/40 bg-ink px-4 py-3 text-white transition-transform hover:scale-[1.005] " +
        (className ?? "")
      }
    >
      <Sparkle weight="fill" size={20} className="shrink-0 text-neon" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-extrabold">You&apos;re playing as a guest</div>
        <div className="text-[11px] font-semibold text-slate-400">
          Create an account to save your picks across devices &amp; unlock leagues, the leaderboard and Market Mode.
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-neon px-3 py-1.5 text-[11px] font-extrabold text-ink">Sign up</span>
    </Link>
  );
}
