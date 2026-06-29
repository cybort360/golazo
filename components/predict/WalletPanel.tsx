"use client";

import { useState } from "react";
import Link from "next/link";
import type { WalletState, WalletReward } from "@/lib/predict/types";
import { useMe } from "@/components/predict/useMe";

const PREVIEW_ADDRESS = "7xKX…9fQ2";

function StatusChip({ status, claimed }: { status: WalletReward["status"]; claimed: boolean }) {
  if (claimed) return <span className="rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-extrabold text-white">✓ Claimed</span>;
  if (status === "pending") return <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold text-slate-500">Pending</span>;
  return null;
}

function RewardRow({
  reward, connected, claimed, onClaim,
}: {
  reward: WalletReward;
  connected: boolean;
  claimed: boolean;
  onClaim: (id: string) => void;
}) {
  const canClaim = connected && reward.status === "claimable" && !claimed;
  return (
    <div className="flex items-center gap-3 border-b border-[#f1f5f9] px-4 py-3.5 last:border-0">
      <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[16px] " + (reward.isToken ? "bg-ink text-neon" : "bg-[#f1f5f9]")}>
        {reward.isToken ? "◎" : "🎁"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-extrabold text-ink">{reward.label}</div>
        <div className="truncate text-[11px] font-semibold text-slate-500">
          {reward.source}{reward.amount ? ` · ${reward.amount}` : ""}
        </div>
      </div>
      {canClaim ? (
        <button type="button" onClick={() => onClaim(reward.id)} className="shrink-0 rounded-full bg-neon px-3.5 py-1.5 text-[12px] font-extrabold text-ink">
          Claim ▸
        </button>
      ) : (
        <StatusChip status={reward.status} claimed={claimed} />
      )}
    </div>
  );
}

export default function WalletPanel({ wallet }: { wallet: WalletState }) {
  const me = useMe();
  const [connected, setConnected] = useState(wallet.connected);
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const address = connected ? wallet.address ?? PREVIEW_ADDRESS : null;
  const onClaim = (id: string) => setClaimed((c) => ({ ...c, [id]: true }));

  return (
    <div className="bg-[#f8fafc]">
      {/* ink header — full bleed */}
      <div className="bg-ink px-5 py-5 text-white lg:px-8 lg:py-6">
        <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
          <Link href={me?.profileHref ?? "/leagues"} className="transition-colors hover:text-white">‹ Profile</Link>
          <span className="rounded-full border border-[#2a2a2a] bg-[#171717] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-neon">Preview</span>
        </div>
        <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Wallet mode</div>
        <div className="mt-1 text-[24px] font-black tracking-[-0.03em] lg:text-[30px]">On-chain rewards</div>
        <div className="mt-1 text-[13px] font-semibold text-slate-400">Optional · connect to claim wallet-based rewards on {wallet.network}</div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5 lg:px-8 lg:py-8">
        {!wallet.eligibleRegion ? (
          <div className="rounded-2xl border border-[#e2e8f0] bg-white px-5 py-6 text-center shadow-card">
            <div className="text-[28px]">🌍</div>
            <div className="mt-2 text-[15px] font-black text-ink">Not available in your region yet</div>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              Wallet rewards are rolling out to supported jurisdictions only. You can keep playing free — picks and leagues work everywhere.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* connection card */}
            <div className="rounded-2xl border border-[#e2e8f0] bg-white px-5 py-5 shadow-card">
              {connected ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-[18px] text-neon">◎</span>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Connected · {wallet.network}</div>
                      <div className="font-mono text-[15px] font-extrabold text-ink">{address}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setConnected(false)} className="rounded-full border border-[#e2e8f0] px-3.5 py-1.5 text-[12px] font-bold text-slate-500 hover:bg-slate-50">
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-[15px] font-black text-ink">Connect a wallet to claim rewards</div>
                  <p className="mt-1.5 text-[13px] font-medium text-slate-500">
                    Wallet mode is optional. The full game is free to play without it — connect only if you want to claim on-chain rewards.
                  </p>
                  <button type="button" onClick={() => setConnected(true)} className="mt-3.5 w-full rounded-full bg-neon py-3 text-[14px] font-extrabold text-ink">
                    Connect wallet (preview)
                  </button>
                </div>
              )}
            </div>

            {/* rewards */}
            <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-card">
              <div className="border-b border-[#f1f5f9] px-4 py-3.5 text-[12px] font-bold text-slate-600">Your rewards</div>
              {wallet.rewards.map((r) => (
                <RewardRow key={r.id} reward={r} connected={connected} claimed={!!claimed[r.id]} onClaim={onClaim} />
              ))}
            </div>

            {/* compliance disclaimer */}
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-[11px] font-semibold leading-relaxed text-slate-500">
              🛡️ Preview only — not live. Wallet mode and on-chain rewards activate in supported jurisdictions after compliance review. No purchase or wager is ever required, and the core game stays free to play. Token rewards launch on Meteora.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
