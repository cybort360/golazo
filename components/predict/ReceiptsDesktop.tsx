import Link from "next/link";
import type { ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString([], { day: "2-digit", month: "short" });
}

function ResultChip({ result }: { result: ProofReceipt["result"] }) {
  if (result === "WON") return <span className="w-[64px] rounded-[7px] bg-green-600 px-2 py-1 text-center text-[10px] font-extrabold text-white">✓ WON</span>;
  if (result === "LOST") return <span className="w-[64px] rounded-[7px] bg-[#fee2e2] px-2 py-1 text-center text-[10px] font-extrabold text-[#b91c1c]">✗ LOST</span>;
  return <span className="w-[64px] rounded-[7px] bg-slate-100 px-2 py-1 text-center text-[10px] font-extrabold text-slate-500">{result}</span>;
}

export default function ReceiptsDesktop({ receipts }: { receipts: ProofReceipt[] }) {
  const total = receipts.length;
  const won = receipts.filter((r) => r.result === "WON").length;
  const points = receipts.reduce((s, r) => s + r.points, 0);
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <div className="hidden lg:block">
      {/* ink banner with summary */}
      <div className="relative overflow-hidden bg-ink px-8 py-7 text-white">
        <div className="pointer-events-none absolute -bottom-8 right-6 select-none text-[120px] font-black opacity-[0.05]">✓</div>
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[30px] font-black tracking-[-0.04em]">Receipts</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">Every settled pick, verified on <span className="font-bold text-slate-200">TxLINE</span>.</p>
          </div>
          <div className="flex shrink-0 gap-8">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Points</div>
              <div className="text-[26px] font-black leading-none tracking-[-0.03em] tabular-nums text-neon">+{formatPoints(points)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Win rate</div>
              <div className="text-[26px] font-black leading-none tracking-[-0.03em] tabular-nums">{winRate}%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Settled</div>
              <div className="text-[26px] font-black leading-none tracking-[-0.03em] tabular-nums">{total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* list */}
      <div className="px-8 py-7">
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="flex items-center gap-4 border-b border-[#eef2f7] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <span className="w-[64px]">Result</span>
            <span className="flex-1">Prediction</span>
            <span className="hidden w-44 xl:block">Verification</span>
            <span className="w-16 text-right">Points</span>
            <span className="w-5" />
          </div>
          {receipts.map((r) => (
            <Link
              key={r.pickId}
              href={`/r/${r.pickId}`}
              className="flex items-center gap-4 border-b border-[#eef2f7] px-5 py-4 transition-colors last:border-0 hover:bg-slate-50"
            >
              <ResultChip result={r.result} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-extrabold text-ink">{r.predictionLabel}</div>
                <div className="mt-0.5 text-[12px] font-medium text-slate-500">
                  {r.home.name} {r.homeScore}–{r.awayScore} {r.away.name} · {dateLabel(r.settledAtMs)}
                </div>
              </div>
              <div className="hidden w-44 items-center gap-1.5 xl:flex">
                <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-green-600 text-[9px] text-white">✓</span>
                <span className="font-mono text-[11px] text-slate-500">{r.payloadRef}</span>
              </div>
              <span className={"w-16 text-right text-[15px] font-black tabular-nums " + (r.result === "WON" ? "text-[#16a34a]" : "text-slate-400")}>
                +{formatPoints(r.points)}
              </span>
              <span className="w-5 text-right text-slate-300">▸</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
