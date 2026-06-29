import { PublicKey } from "@solana/web3.js";

// Devnet program IDs. Read from env when present, else fall back to the pinned
// keypair-derived IDs baked into the Anchor workspace (Anchor.toml / declare_id).
export const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet") as
  | "devnet"
  | "mainnet-beta"
  | "testnet";

export const TXLINE_MOCK_PROGRAM = new PublicKey(
  process.env.NEXT_PUBLIC_TXLINE_MOCK_PROGRAM || "Go73N2JanmNjxJz7rGdTcd1PzgTZCuM9uRC11jvQGV7w",
);

export const GOLAZO_PREDICT_PROGRAM = new PublicKey(
  process.env.NEXT_PUBLIC_GOLAZO_PREDICT_PROGRAM || "GJNVa5XpYWUaJnbxx4TmepNM4D9JDAoCSC2FCRmRWGA5",
);

// The GOLAZO mint is a PDA of the predict program, so it is derivable even
// before the env var is written by the deploy script.
export const [GOLAZO_MINT] = PublicKey.findProgramAddressSync(
  [Buffer.from("golazo_mint")],
  GOLAZO_PREDICT_PROGRAM,
);

export const GOLAZO_DECIMALS = 6;
