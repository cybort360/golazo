import SocialLinks from "@/components/SocialLinks";

// Site-wide footer: the "Join the community" card on every page.
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-[#f8fafc]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Join the Golazo community
            </h2>
            <p className="text-sm text-slate-500">
              Make picks, climb your league, and prove you know ball — first on Telegram and X.
            </p>
          </div>
          <SocialLinks variant="chip" />
        </section>
        <p className="mt-4 text-center text-xs text-slate-400">
          Golazo · Prove you know ball
        </p>
      </div>
    </footer>
  );
}
