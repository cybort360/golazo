import Link from "next/link";
import SocialLinks from "@/components/SocialLinks";

// Site-wide footer: brand line + community links. Persistent on every page.
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <div className="flex flex-col items-center gap-0.5 sm:items-start">
          <span className="text-sm font-bold tracking-tight text-slate-900">Golazo</span>
          <span className="text-xs text-slate-400">World Cup 2026 · on Solana</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Join the community</span>
          <SocialLinks />
        </div>
        <Link
          href="/predict"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          Predict &amp; win →
        </Link>
      </div>
    </footer>
  );
}
