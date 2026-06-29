"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProofReceipt as Receipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import ShareButton from "@/components/predict/ShareButton";
import { SealCheck, Check } from "@phosphor-icons/react/dist/ssr";

// Telegram/Discord-friendly share copy for a settled pick (PRD §6.2 communities).
export function shareCopy(r: Receipt): { title: string; text: string } {
  const won = r.result === "WON";
  return {
    title: "Golazo — verified pick",
    text: won
      ? `Called it. ${r.predictionLabel} — +${formatPoints(r.points)} pts, verified by TxLINE.`
      : `${r.predictionLabel} — ${r.result}. Verified by TxLINE. Prove you know ball:`,
  };
}

function settledTime(ms: number): string {
  return new Date(ms).toISOString().slice(11, 16) + " UTC";
}

function MonoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={valueClass ?? "text-ink"}>{value}</span>
    </div>
  );
}

export default function ProofReceipt({ receipt }: { receipt: Receipt }) {
  const [open, setOpen] = useState(true);
  const score = `${receipt.home.name} ${receipt.homeScore}–${receipt.awayScore} ${receipt.away.name}`;

  return (
    <div className="w-full">
      {/* ticket */}
      <div className="relative overflow-hidden rounded-[22px] bg-ink px-5 pt-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 60% at 50% -10%,rgba(212,255,63,0.16),transparent 60%)" }}
        />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black tracking-[-0.03em] text-white">GOLAZO</div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(22,163,74,0.45)] bg-[rgba(22,163,74,0.16)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.06em] text-[#4ade80]">
              <SealCheck weight="fill" size={12} /> VERIFIED
            </span>
          </div>

          <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Your prediction</div>
          <div className="mt-1.5 text-lg font-extrabold text-white">{receipt.predictionLabel}</div>
          <div className="glz-rise mt-2.5 text-[64px] font-black leading-[0.9] tracking-[-0.05em] text-neon">
            {receipt.result}
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Final score</div>
              <div className="mt-0.5 text-[17px] font-extrabold tabular-nums text-white">{score}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Points</div>
              <div className="mt-0.5 text-2xl font-black tabular-nums leading-none tracking-[-0.03em] text-neon">
                +{formatPoints(receipt.points)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-dashed border-[#2a2a2a] py-3.5">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-green-600 text-white"><Check weight="bold" size={12} /></span>
            <span className="text-xs font-semibold text-slate-400">
              Verified by <span className="font-bold text-slate-200">TxLINE</span> · settled {settledTime(receipt.settledAtMs)}
            </span>
          </div>
        </div>

        {/* perforation notches */}
        <div className="relative h-0">
          <div className="absolute -left-[30px] -top-[13px] h-[26px] w-[26px] rounded-full bg-[#f1f5f9]" />
          <div className="absolute -right-[30px] -top-[13px] h-[26px] w-[26px] rounded-full bg-[#f1f5f9]" />
        </div>

        <div className="flex gap-2 pb-4 pt-4">
          <ShareButton
            path={`/r/${receipt.pickId}`}
            label="Share receipt"
            className="flex-[1.4] rounded-xl bg-neon py-3 text-center text-sm font-black text-ink"
            {...shareCopy(receipt)}
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#171717] py-3 text-center text-[13px] font-bold text-slate-200"
          >
            Advanced
          </button>
        </div>
      </div>

      {/* advanced proof (quiet) */}
      {open && (
        <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-3.5 py-3 text-xs font-bold text-slate-600">
            <span>Advanced proof</span>
            <span className="text-slate-400">▾</span>
          </div>
          <div className="space-y-1.5 px-3.5 py-3 font-mono text-[10.5px] leading-relaxed text-slate-500">
            <MonoRow label="match_id" value={receipt.fixtureId} />
            <MonoRow label="settled_at" value={new Date(receipt.settledAtMs).toISOString()} />
            <MonoRow label="data_hash" value={receipt.payloadRef} />
            {receipt.merkleStatus && (
              <MonoRow label="attestation" value={receipt.merkleStatus} valueClass="text-green-600" />
            )}
            {receipt.txUrl && <MonoRow label="transaction" value="view ↗" valueClass="text-blue-600" />}
          </div>
          <Link
            href={`/r/${receipt.pickId}/proof`}
            className="block border-t border-[#f1f5f9] px-3.5 py-3 text-center text-[12px] font-bold text-ink"
          >
            Open full proof explorer ▸
          </Link>
        </div>
      )}
    </div>
  );
}
