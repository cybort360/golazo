"use client";
import { useMemo } from "react";
import { hashLeaf, verifyProof, toHex } from "@/lib/txline/merkle";
import { buildMatchProof, proofForStat } from "@/lib/txline/proof";
import { Check, X, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

// Independent, client-side Merkle verification of a match result — the same proof
// the chain checks inside validate_stat. It (1) recomputes the leaf/root/sibling
// path from the raw stats in your browser, and (2) cross-checks that recomputed
// root against the root committed on Solana. If they match, settlement was
// trustless: don't trust our server, verify the bytes yourself.
export default function MerkleVerifyPanel({
  matchId,
  marketId,
  stats,
  onChainRoot,
  rootExplorerUrl,
}: {
  matchId: string;
  marketId: string;
  stats: Record<string, 0 | 1>;
  onChainRoot?: string | null;
  rootExplorerUrl?: string | null;
}) {
  const data = useMemo(() => {
    const big: Record<string, bigint> = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [k, BigInt(v)]),
    );
    const { root } = buildMatchProof(matchId, big);
    const { claimedValue, proof } = proofForStat(matchId, big, marketId);
    const leaf = hashLeaf(matchId, marketId, claimedValue);
    const ok = verifyProof(leaf, proof, root);
    const rootHex = toHex(root);
    const chain = onChainRoot ? onChainRoot.replace(/^0x/, "").toLowerCase() : null;
    const matchesChain = chain ? rootHex === chain : null;
    return { rootHex, leaf, proof, claimedValue, ok, chain, matchesChain };
  }, [matchId, marketId, stats, onChainRoot]);

  // The headline verdict: prefer the on-chain cross-check when we have a root.
  const verified = data.matchesChain ?? data.ok;

  const Row = ({ label, value, valueClass, href }: { label: string; value: string; valueClass?: string; href?: string | null }) => (
    <div className="flex items-start justify-between gap-3 border-b border-[#1d1d22] py-2 last:border-0">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={"break-all text-right font-mono text-[11px] text-neon hover:underline " + (valueClass ?? "")}>
          {value} ↗
        </a>
      ) : (
        <span className={"break-all text-right font-mono text-[11px] " + (valueClass ?? "text-slate-300")}>{value}</span>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-[#26262b] bg-ink px-5 py-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-neon">
          <ShieldCheck weight="fill" size={14} /> Merkle verification
        </div>
        <span
          className={
            "rounded-full px-2.5 py-0.5 text-[11px] font-black " +
            (verified ? "bg-neon text-ink" : "bg-red-500 text-white")
          }
        >
          {verified ? (
            <span className="inline-flex items-center gap-1"><Check weight="bold" size={11} /> {data.matchesChain != null ? "matches on-chain" : "verified"}</span>
          ) : (
            <span className="inline-flex items-center gap-1"><X weight="bold" size={11} /> {data.matchesChain === false ? "mismatch" : "invalid"}</span>
          )}
        </span>
      </div>

      <div className="mt-2">
        <Row label="Stat" value={`${marketId} = ${data.claimedValue.toString()} (${data.claimedValue === 1n ? "YES" : "NO"})`} />
        <Row label="Leaf" value={data.leaf ? toHex(data.leaf) : ""} />
        <Row label="Recomputed root" value={data.rootHex} valueClass={data.matchesChain === false ? "text-red-400" : "text-slate-300"} />
        {data.chain && (
          <Row
            label="On-chain root"
            value={data.matchesChain ? data.rootHex : data.chain}
            valueClass={data.matchesChain ? "text-neon" : "text-red-400"}
            href={rootExplorerUrl ?? undefined}
          />
        )}
        {data.proof.map((p, i) => (
          <Row key={i} label={`Path ${i}`} value={toHex(p)} />
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Recomputed in your browser from the raw stats and checked against{" "}
        <span className="font-mono text-slate-400">txline_mock::validate_stat</span>
        {data.chain ? ", the same root committed on Solana." : ", the same proof the chain checks at settlement."}
      </p>
    </div>
  );
}
