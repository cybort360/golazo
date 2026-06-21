"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import type { Adapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

import "@solana/wallet-adapter-react-ui/styles.css";

import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { burnToken } from "@/lib/burnToken";

// Burning signs a real transaction (unlike the predict page, which only signs a
// message), so this panel mounts its own wallet context and never autoConnects —
// the operator connects deliberately every session. Lives only on the admin
// panel, so the wallet libs stay off public pages.

const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

interface BurnPanelProps {
  showToast: (kind: "success" | "error", message: string) => void;
  requestConfirm: (
    message: string,
    action: () => void | Promise<void>,
  ) => void;
}

const btn =
  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40";
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;
const input =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-green-500/40 placeholder:text-slate-400 focus:ring-2";

// Format base units to a readable token count for the supply before/after lines.
function fmtSupply(base: bigint, decimals: number): string {
  const divisor = BigInt("1" + "0".repeat(decimals));
  const whole = base / divisor;
  return whole.toLocaleString("en-US");
}

function BurnInner({ showToast, requestConfirm }: BurnPanelProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { golazo } = useTokenAddresses();

  const [mint, setMint] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  // Connected wallet's balance of the chosen mint. `raw` is the exact
  // uiAmountString (used to fill the input — no float rounding); `ui` is just
  // for display.
  const [balance, setBalance] = useState<{ ui: number; raw: string } | null>(
    null,
  );
  const [balLoading, setBalLoading] = useState(false);
  const [result, setResult] = useState<{
    sig: string;
    line: string;
  } | null>(null);

  // Default the mint to the live $GOLAZO address once it loads, unless the
  // operator has already typed something.
  const golazoMint = golazo.address ?? "";
  const effectiveMint = mint || golazoMint;
  const usingGolazo = effectiveMint && effectiveMint === golazoMint;

  // Read how much of the chosen mint the connected wallet holds, so the
  // operator can click their balance straight into the amount field instead of
  // typing it. Re-runs when the wallet or mint changes, or after a burn lands.
  useEffect(() => {
    if (!publicKey || !effectiveMint.trim()) {
      setBalance(null);
      return;
    }
    let mintPk: PublicKey;
    try {
      mintPk = new PublicKey(effectiveMint.trim());
    } catch {
      setBalance(null);
      return;
    }
    let cancelled = false;
    setBalLoading(true);
    const ata = getAssociatedTokenAddressSync(mintPk, publicKey);
    connection
      .getTokenAccountBalance(ata)
      .then((b) => {
        if (!cancelled)
          setBalance({
            ui: b.value.uiAmount ?? 0,
            raw: b.value.uiAmountString ?? "0",
          });
      })
      .catch(() => {
        // No token account / wallet holds none of it.
        if (!cancelled) setBalance({ ui: 0, raw: "0" });
      })
      .finally(() => {
        if (!cancelled) setBalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, effectiveMint, connection, result]);

  const run = () => {
    if (!effectiveMint.trim()) {
      showToast("error", "Enter a mint address to burn");
      return;
    }
    if (!amount.trim()) {
      showToast("error", "Enter an amount to burn");
      return;
    }
    if (!publicKey || !sendTransaction) {
      showToast("error", "Connect a wallet first");
      return;
    }

    const label = usingGolazo ? "$GOLAZO" : effectiveMint.slice(0, 8) + "…";
    requestConfirm(
      `Permanently burn ${amount} ${label}? This destroys supply on-chain and cannot be undone.`,
      async () => {
        setBusy(true);
        setResult(null);
        try {
          const r = await burnToken({
            connection,
            owner: publicKey,
            sendTransaction,
            mint: effectiveMint.trim(),
            amount: amount.trim(),
          });
          const before = fmtSupply(r.before, r.decimals);
          const after = fmtSupply(r.after, r.decimals);
          setResult({
            sig: r.signature,
            line: `Supply ${before} → ${after}`,
          });
          showToast("success", "Burn confirmed");
          setAmount("");
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Burn failed or was cancelled";
          showToast("error", msg);
        } finally {
          setBusy(false);
        }
      },
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
        10. Burn Supply
      </h2>
      <p className="text-xs text-slate-400">
        Permanently destroys tokens from the connected wallet and reduces the
        mint&apos;s on-chain supply. Connect the wallet that holds the tokens,
        then sign in your wallet. Irreversible.
      </p>

      <WalletMultiButton
        style={{
          backgroundColor: "#16a34a",
          height: "auto",
          padding: "0.5rem 0.85rem",
          fontSize: "0.8rem",
          borderRadius: "0.5rem",
        }}
      />

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Mint address
          <input
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder={golazoMint || "Token mint address"}
            className={`${input} w-full font-mono`}
          />
          {usingGolazo && (
            <span className="text-[11px] text-green-600">
              Using the live $GOLAZO mint
            </span>
          )}
          {!effectiveMint && (
            <span className="text-[11px] text-amber-600">
              $GOLAZO address not set yet — paste a mint to burn
            </span>
          )}
        </label>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Amount to burn</span>
            {connected &&
              (balLoading ? (
                <span className="text-[11px] text-slate-400">
                  Checking balance…
                </span>
              ) : balance ? (
                <button
                  type="button"
                  onClick={() => setAmount(balance.raw)}
                  className="text-[11px] font-semibold text-green-600 hover:underline"
                  title="Click to burn your full balance"
                >
                  Balance:{" "}
                  {balance.ui.toLocaleString("en-US", {
                    maximumFractionDigits: 4,
                  })}{" "}
                  · Max
                </button>
              ) : null)}
          </div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 1000000"
            className={`${input} w-full`}
          />
        </div>
      </div>

      <div>
        <button
          onClick={run}
          disabled={busy || !connected}
          className={btnDanger}
        >
          {busy ? "Burning…" : "Burn tokens"}
        </button>
      </div>

      {result && (
        <div className="flex flex-col gap-1 rounded-lg border border-green-200 bg-green-50 p-3 text-xs">
          <span className="font-semibold text-green-700">{result.line}</span>
          <a
            href={`https://solscan.io/tx/${result.sig}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-green-700 underline"
          >
            {result.sig.slice(0, 12)}… · view on Solscan
          </a>
        </div>
      )}
    </section>
  );
}

export default function BurnPanel(props: BurnPanelProps) {
  const wallets = useMemo<Adapter[]>(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <BurnInner {...props} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
