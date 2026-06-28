import Link from "next/link";
import type { ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";

function VRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] py-2.5 last:border-0">
      <span className="font-mono text-[12px] text-slate-500">{label}</span>
      <span className={"font-mono text-[12px] " + (valueClass ?? "text-ink")}>{value}</span>
    </div>
  );
}

export default function ReceiptDetailDesktop({ receipt }: { receipt: ProofReceipt }) {
  const won = receipt.result === "WON";
  const resultColor = won ? "text-neon" : receipt.result === "LOST" ? "text-[#f87171]" : "text-slate-300";
  const score = `${receipt.home.name} ${receipt.homeScore}–${receipt.awayScore} ${receipt.away.name}`;

  return (
    <div className="hidden lg:block">
      {/* ink banner */}
      <div className="bg-ink px-8 py-5 text-white">
        <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
          <Link href="/receipts" className="transition-colors hover:text-white">‹ Back to receipts</Link>
          <span className="font-semibold text-slate-500">Receipt · {receipt.fixtureId}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-[440px_1fr] items-start gap-7 px-8 py-8">
        {/* ticket */}
        <div className="relative overflow-hidden rounded-[24px] bg-ink px-7 pb-7 pt-7">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 55% at 50% -10%,rgba(212,255,63,0.18),transparent 60%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-xl font-black tracking-[-0.03em] text-white">GOLAZO</div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(22,163,74,0.45)] bg-[rgba(22,163,74,0.16)] px-3 py-1.5 text-[12px] font-extrabold tracking-[0.06em] text-[#4ade80]">✓ VERIFIED</span>
            </div>
            <div className="mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Your prediction</div>
            <div className="mt-2 text-xl font-extrabold text-white">{receipt.predictionLabel}</div>
            <div className={"glz-rise mt-3 text-[80px] font-black leading-[0.85] tracking-[-0.05em] " + resultColor}>{receipt.result}</div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Final score</div>
                <div className="mt-1 text-[18px] font-extrabold tabular-nums text-white">{score}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Points</div>
                <div className={"mt-1 text-[30px] font-black leading-none tracking-[-0.03em] tabular-nums " + (won ? "text-neon" : "text-slate-400")}>+{formatPoints(receipt.points)}</div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-dashed border-[#2a2a2a] pt-4">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-green-600 text-[11px] text-white">✓</span>
              <span className="text-[12px] font-semibold text-slate-400">Verified by <span className="font-bold text-slate-200">TxLINE</span></span>
            </div>
          </div>
        </div>

        {/* verification + actions */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
            <div className="border-b border-[#f1f5f9] px-5 py-3.5 text-[12px] font-bold text-slate-600">Verification trail</div>
            <div className="px-5 py-3">
              <VRow label="match_id" value={receipt.fixtureId} />
              <VRow label="match_state" value={receipt.matchState} />
              <VRow label="market" value={receipt.marketLabel} />
              <VRow label="stat_keys" value={receipt.statKeys} />
              <VRow label="settled_at" value={new Date(receipt.settledAtMs).toISOString()} />
              <VRow label="data_hash" value={receipt.payloadRef} />
              {receipt.merkleStatus && <VRow label="attestation" value={`${receipt.merkleStatus} ✓`} valueClass="text-green-600" />}
              {receipt.onChainStatus && <VRow label="on_chain" value={`${receipt.onChainStatus} ✓`} valueClass="text-green-600" />}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" className="flex-1 rounded-xl bg-neon py-3 text-center text-sm font-black text-ink">Share receipt</button>
            <Link href={`/r/${receipt.pickId}/proof`} className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-slate-50">Proof explorer ▸</Link>
            {receipt.txUrl && (
              <a href={receipt.txUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-sm font-bold text-blue-600 transition-colors hover:bg-slate-50">View on Solscan ↗</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
