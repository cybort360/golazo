import Link from "next/link";
import type { ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import { Check, X } from "@phosphor-icons/react/dist/ssr";

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function ReceiptsMobile({ receipts }: { receipts: ProofReceipt[] }) {
  const total = receipts.length;
  const won = receipts.filter((r) => r.result === "WON").length;
  const points = receipts.reduce((s, r) => s + r.points, 0);
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8 lg:hidden">
      <h1 className="text-2xl font-black tracking-[-0.03em]">Receipts</h1>

      {/* summary tiles */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { k: "Points", v: `+${formatPoints(points)}`, accent: true },
          { k: "Win rate", v: `${winRate}%` },
          { k: "Settled", v: String(total) },
        ].map((t) => (
          <div key={t.k} className="rounded-2xl bg-ink px-3 py-3 text-center">
            <div className={"text-[19px] font-black tabular-nums " + (t.accent ? "text-neon" : "text-white")}>{t.v}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{t.k}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {receipts.map((r) => (
          <Link
            key={r.pickId}
            href={`/r/${r.pickId}`}
            className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-3.5 py-3 shadow-card"
          >
            <span
              className={
                "inline-flex items-center gap-1 rounded-[7px] px-2 py-1 text-[10px] font-extrabold " +
                (r.result === "WON" ? "bg-green-600 text-white" : r.result === "LOST" ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-slate-100 text-slate-500")
              }
            >
              {r.result === "WON" ? <><Check weight="bold" size={11} /> WON</> : r.result === "LOST" ? <><X weight="bold" size={11} /> LOST</> : r.result}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-extrabold text-ink">{r.predictionLabel}</div>
              <div className="text-[11px] font-medium text-slate-500">
                {r.home.name} {r.homeScore}–{r.awayScore} {r.away.name} · {dateLabel(r.settledAtMs)}
              </div>
            </div>
            <span className={"text-[14px] font-black tabular-nums " + (r.result === "WON" ? "text-[#16a34a]" : "text-slate-400")}>
              +{formatPoints(r.points)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
