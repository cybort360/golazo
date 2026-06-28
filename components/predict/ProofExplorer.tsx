"use client";

import Link from "next/link";
import type { ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import { parseStatKeys, buildPipeline, buildRawPayload } from "@/lib/predict/proof";
import CopyButton from "@/components/predict/CopyButton";

function FieldRow({ label, value, valueClass, copy }: { label: string; value: string; valueClass?: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] py-2.5 last:border-0">
      <span className="font-mono text-[12px] text-slate-500">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={"truncate font-mono text-[12px] " + (valueClass ?? "text-ink")}>{value}</span>
        {copy && <CopyButton value={value} label="copy" className="shrink-0 rounded-md border border-[#e2e8f0] px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50" />}
      </span>
    </div>
  );
}

export default function ProofExplorer({ receipt }: { receipt: ProofReceipt }) {
  const pipeline = buildPipeline(receipt);
  const inputs = parseStatKeys(receipt.statKeys);
  const raw = JSON.stringify(buildRawPayload(receipt), null, 2);
  const score = `${receipt.home.name} ${receipt.homeScore}–${receipt.awayScore} ${receipt.away.name}`;

  return (
    <div className="bg-[#f8fafc]">
      {/* ink header — full bleed */}
      <div className="bg-ink px-5 py-5 text-white lg:px-8 lg:py-6">
        <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
          <Link href={`/r/${receipt.pickId}`} className="transition-colors hover:text-white">‹ Back to receipt</Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(22,163,74,0.45)] bg-[rgba(22,163,74,0.16)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.06em] text-[#4ade80]">✓ VERIFIED</span>
        </div>
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Proof explorer</div>
          <div className="mt-1 text-[22px] font-black tracking-[-0.03em] lg:text-[28px]">{receipt.predictionLabel}</div>
          <div className="mt-1 text-[13px] font-semibold text-slate-400">{score} · +{formatPoints(receipt.points)} pts · {receipt.fixtureId}</div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-5 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-8">
        {/* verification pipeline */}
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="border-b border-[#f1f5f9] px-5 py-3.5 text-[12px] font-bold text-slate-600">Verification pipeline</div>
          <ol className="px-5 py-4">
            {pipeline.map((stage, i) => {
              const last = i === pipeline.length - 1;
              const ok = stage.status === "valid";
              return (
                <li key={stage.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && <span className="absolute left-[11px] top-6 h-full w-px bg-[#e2e8f0]" />}
                  <span className={"relative z-10 mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full text-[12px] " + (ok ? "bg-green-600 text-white" : "border border-dashed border-slate-300 bg-white text-slate-400")}>
                    {ok ? "✓" : "•"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-ink">{stage.label}</div>
                    <div className="truncate font-mono text-[11px] text-slate-500">{stage.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* raw fields */}
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="border-b border-[#f1f5f9] px-5 py-3.5 text-[12px] font-bold text-slate-600">Validation record</div>
          <div className="px-5 py-3">
            <FieldRow label="fixture_id" value={receipt.fixtureId} />
            <FieldRow label="match_state" value={receipt.matchState} />
            <FieldRow label="market" value={receipt.marketLabel} />
            <FieldRow label="data_hash" value={receipt.payloadRef} copy />
            {receipt.merkleStatus && <FieldRow label="merkle_status" value={`${receipt.merkleStatus} ✓`} valueClass="text-green-600" />}
            {receipt.onChainStatus && <FieldRow label="on_chain_status" value={`${receipt.onChainStatus} ✓`} valueClass="text-green-600" />}
            <FieldRow label="settled_at" value={new Date(receipt.settledAtMs).toISOString()} />
          </div>
        </section>

        {/* parsed stat inputs */}
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="border-b border-[#f1f5f9] px-5 py-3.5 text-[12px] font-bold text-slate-600">Settlement inputs</div>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {inputs.length > 0 ? inputs.map((s) => (
              <span key={s.key} className="rounded-lg bg-[#f1f5f9] px-2.5 py-1.5 font-mono text-[11px] text-slate-600">
                <span className="text-slate-400">{s.key}</span> = <span className="font-bold text-ink">{s.value}</span>
              </span>
            )) : <span className="font-mono text-[11px] text-slate-400">no stat keys recorded</span>}
          </div>
        </section>

        {/* raw payload */}
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-3 text-[12px] font-bold text-slate-600">
            <span>Raw payload</span>
            <CopyButton value={raw} label="Copy JSON" className="rounded-md border border-[#e2e8f0] px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50" />
          </div>
          <pre className="overflow-x-auto bg-ink px-5 py-4 font-mono text-[11px] leading-relaxed text-slate-300">{raw}</pre>
        </section>

        {receipt.txUrl && (
          <a href={receipt.txUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 text-center text-sm font-bold text-blue-600 transition-colors hover:bg-slate-50 lg:col-span-2">
            View on-chain attestation on Solscan ↗
          </a>
        )}
      </div>
    </div>
  );
}
