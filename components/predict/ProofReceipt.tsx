"use client";

import { useState } from "react";
import type { ProofReceipt as Receipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function ProofReceipt({ receipt }: { receipt: Receipt }) {
  const [open, setOpen] = useState(false);
  const score = `${receipt.home.ticker} ${receipt.homeScore} – ${receipt.awayScore} ${receipt.away.ticker}`;
  return (
    <div className="mx-auto max-w-xs overflow-hidden rounded-3xl bg-ink shadow-card-md">
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="font-black tracking-tight text-neon">GOLAZO</span>
        <span className="rounded-full bg-neon px-2 py-0.5 text-[9px] font-black tracking-wider text-ink">✓ VERIFIED</span>
      </div>
      <div className="px-5 pb-3 pt-1.5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{receipt.predictionLabel}</div>
        <div className="my-1 text-4xl font-black tracking-tight text-neon">{receipt.result}</div>
        <div className="text-sm font-extrabold text-white">{score}</div>
        <div className="mt-2.5 inline-block rounded-full bg-green-600 px-3.5 py-1 text-sm font-black text-white">
          +{formatPoints(receipt.points)} pts
        </div>
      </div>
      <div className="bg-[#1f1f1f] px-5 py-2.5 text-center text-[10px] text-neutral-400">
        Verified by <span className="font-extrabold text-neon">TxLINE</span>
      </div>
      <div className="flex gap-2 px-4 py-3">
        <button type="button" className="flex-1 rounded-xl bg-neon py-2.5 text-xs font-black text-ink">Share receipt</button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 rounded-xl bg-neutral-800 py-2.5 text-xs font-bold text-neutral-200"
        >
          {open ? "Hide proof ▴" : "View advanced proof ▾"}
        </button>
      </div>
      {open && (
        <div className="mx-4 mb-4 rounded-xl bg-white px-3 py-2 text-[11px] text-slate-900">
          <Row label="Fixture ID" value={receipt.fixtureId} />
          <Row label="Match state" value={receipt.matchState} />
          <Row label="Market" value={receipt.marketLabel} />
          <Row label="Stat keys" value={receipt.statKeys} />
          <Row label="Payload ref" value={receipt.payloadRef} />
          {receipt.merkleStatus && <Row label="Merkle proof" value={receipt.merkleStatus} />}
          {receipt.onChainStatus && <Row label="On-chain" value={receipt.onChainStatus} />}
          <Row label="Settled at" value={new Date(receipt.settledAtMs).toISOString().slice(11, 19) + " UTC"} />
          {receipt.txUrl && <Row label="Transaction" value="view ↗" />}
        </div>
      )}
    </div>
  );
}
