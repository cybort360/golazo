import { TEAMS } from "./teams";

export interface TokenInfo {
  ticker: string;
  name: string;
  address: string | null;
  pumpUrl: string | null;
  axiomUrl: string | null;
  isGolazo?: boolean;
}

// Platform token
export const GOLAZO_TOKEN: TokenInfo = {
  ticker: "GOLAZO",
  name: "Golazo",
  address: null, // fill after launch
  pumpUrl: null,
  axiomUrl: null,
  isGolazo: true,
};

// All 49 tokens (GOLAZO + 48 teams)
export const ALL_TOKENS: TokenInfo[] = [
  GOLAZO_TOKEN,
  ...TEAMS.map((t) => ({
    ticker: t.ticker,
    name: t.name,
    address: t.tokenAddress,
    pumpUrl: t.pumpUrl,
    axiomUrl: t.axiomUrl,
  })),
];
