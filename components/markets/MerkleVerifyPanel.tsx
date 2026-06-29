"use client";
import { useMemo } from "react";
import { hashLeaf, verifyProof, toHex } from "@/lib/txline/merkle";
import { buildMatchProof, proofForStat } from "@/lib/txline/proof";
import { Check, X } from "@phosphor-icons/react/dist/ssr";

// Client-side Merkle verification of a match result — the same proof the chain
// checks inside validate_stat. Shows leaf / root / sibling path and a live result.
export default function MerkleVerifyPanel({
  matchId,
  marketId,
  stats,
}: {
  matchId: string;
  marketId: string;
  stats: Record<string, 0 | 1>;
}) {
  const data = useMemo(() => {
    const big: Record<string, bigint> = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [k, BigInt(v)]),
    );
    const { root } = buildMatchProof(matchId, big);
    const { claimedValue, proof } = proofForStat(matchId, big, marketId);
    const leaf = hashLeaf(matchId, marketId, claimedValue);
    const ok = verifyProof(leaf, proof, root);
    return { root, leaf, proof, claimedValue, ok };
  }, [matchId, marketId, stats]);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-3 border-b border-[#1d1d22] py-2 last:border-0">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="break-all text-right font-mono text-[11px] text-slate-300">{value}</span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-[#26262b] bg-ink px-5 py-4 text-white">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-neon">Merkle verification</div>
        <span
          className={
            "rounded-full px-2.5 py-0.5 text-[11px] font-black " +
            (data.ok ? "bg-neon text-ink" : "bg-red-500 text-white")
          }
        >
          {data.ok ? <span className="inline-flex items-center gap-1"><Check weight="bold" size={11} /> verified</span> : <span className="inline-flex items-center gap-1"><X weight="bold" size={11} /> invalid</span>}
        </span>
      </div>
      <div className="mt-2">
        <Row label="Stat" value={`${marketId} = ${data.claimedValue.toString()} (${data.claimedValue === 1n ? "YES" : "NO"})`} />
        <Row label="Leaf" value={toHex(data.leaf)} />
        <Row label="Root" value={toHex(data.root)} />
        {data.proof.map((p, i) => (
          <Row key={i} label={`Path ${i}`} value={toHex(p)} />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        The same proof is recomputed on-chain inside{" "}
        <span className="font-mono text-slate-400">txline_mock::validate_stat</span> during settlement.
      </p>
    </div>
  );
}
