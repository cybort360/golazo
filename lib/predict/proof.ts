import type { ProofReceipt } from "@/lib/predict/types";

export interface StatInput {
  key: string;
  value: string;
}

// "home_g=3, away_g=1" -> [{key:"home_g",value:"3"}, {key:"away_g",value:"1"}]
export function parseStatKeys(statKeys: string): StatInput[] {
  return statKeys
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return { key: pair, value: "" };
      return { key: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() };
    });
}

export type StageStatus = "valid" | "pending";

export interface ProofStage {
  id: string;
  label: string;
  detail: string;
  status: StageStatus;
}

// The end-to-end verification pipeline for a settled prediction, deepest-audit
// view: ingest -> settle -> Merkle attest -> on-chain anchor.
export function buildPipeline(r: ProofReceipt): ProofStage[] {
  return [
    { id: "ingested", label: "Match data ingested", detail: `via TxLINE · ${r.fixtureId}`, status: "valid" },
    { id: "settled", label: "Result computed & settled", detail: new Date(r.settledAtMs).toISOString(), status: "valid" },
    {
      id: "attested",
      label: "Merkle attestation",
      detail: r.merkleStatus ? `${r.merkleStatus} · ${r.payloadRef}` : "not anchored",
      status: r.merkleStatus ? "valid" : "pending",
    },
    {
      id: "on_chain",
      label: "On-chain anchor",
      detail: r.onChainStatus ? `${r.onChainStatus}${r.txUrl ? " · tx available" : ""}` : "off-chain",
      status: r.onChainStatus ? "valid" : "pending",
    },
  ];
}

// Reconstruct the raw settlement payload for deep auditability.
export function buildRawPayload(r: ProofReceipt): Record<string, unknown> {
  const inputs: Record<string, string> = {};
  for (const { key, value } of parseStatKeys(r.statKeys)) inputs[key] = value;
  return {
    fixture_id: r.fixtureId,
    match_state: r.matchState,
    market: r.marketLabel,
    prediction: r.predictionLabel,
    result: r.result,
    points: r.points,
    inputs,
    attestation: {
      data_hash: r.payloadRef,
      merkle: r.merkleStatus,
      on_chain: r.onChainStatus,
    },
    settled_at: new Date(r.settledAtMs).toISOString(),
    settled_at_epoch_ms: r.settledAtMs,
    tx: r.txUrl,
  };
}
