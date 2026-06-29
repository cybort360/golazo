// Skeleton loaders — shown while a screen's data loads. They mirror the real
// layout with a subtle shimmer so the page feels instant and doesn't jump.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={"animate-pulse rounded-md bg-slate-200/70 " + className} />;
}

// A full-screen placeholder. `variant` picks a layout close to the target page:
//   list   — header + stacked rows (matches, receipts, leagues, leaderboard)
//   detail — header + one large card (match, receipt, proof, profile)
export function ScreenSkeleton({ variant = "list" }: { variant?: "list" | "detail" }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* ink header band, matching the real screens */}
      <div className="bg-ink px-5 py-6 lg:px-8">
        <Skeleton className="h-6 w-44 bg-white/10" />
        <Skeleton className="mt-2 h-3.5 w-60 bg-white/5" />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5 md:px-8 lg:max-w-5xl">
        {variant === "detail" ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
