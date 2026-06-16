import { TEAMS } from "./teams";

export interface TokenInfo {
  ticker: string;
  name: string;
  address: string | null;
  meteoraUrl: string | null;
  axiomUrl: string | null;
  isGolazo?: boolean;
  listed?: boolean; // team tokens only; false = no market (omit from admin form)
}

// Platform token
export const GOLAZO_TOKEN: TokenInfo = {
  ticker: "GOLAZO",
  name: "Golazo",
  address: null, // fill after launch
  meteoraUrl: null,
  axiomUrl: null,
  isGolazo: true,
};

// All 49 tokens (GOLAZO + 48 teams). Carries `listed` so consumers (e.g. the
// admin form) can skip teams that have no market.
export const ALL_TOKENS: TokenInfo[] = [
  GOLAZO_TOKEN,
  ...TEAMS.map((t) => ({
    ticker: t.ticker,
    name: t.name,
    address: t.tokenAddress,
    meteoraUrl: t.meteoraUrl,
    axiomUrl: t.axiomUrl,
    listed: t.listed,
  })),
];
