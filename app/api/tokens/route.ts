import { kv } from "@vercel/kv";
import { TEAMS, type Team } from "@/constants/teams";
import { GOLAZO_TOKEN, type TokenInfo } from "@/constants/tokens";
import { safeHttpUrl } from "@/lib/url";

// Read from KV on every request; never prerender (KV may be unconfigured at
// build time). Merges admin-managed token addresses over the static defaults so
// tokens can be launched without a redeploy.
export const dynamic = "force-dynamic";

// Shape stored under the `token_addresses` KV key by the admin panel, keyed by
// ticker (e.g. "BRA", "GOLAZO").
interface TokenOverride {
  address: string;
  pumpUrl: string;
  axiomUrl: string;
}

/** Empty / whitespace-only strings mean "not set" → null. */
function clean(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Like clean(), but also drops anything that isn't a safe http(s) URL, so
 *  admin-entered links can't smuggle javascript:/data: into an href. */
function cleanUrl(value: string | undefined): string | null {
  return safeHttpUrl(clean(value));
}

export async function GET() {
  let overrides: Record<string, TokenOverride> = {};
  try {
    overrides =
      (await kv.get<Record<string, TokenOverride>>("token_addresses")) ?? {};
  } catch {
    // KV not configured or unreachable, so degrade to static defaults.
    overrides = {};
  }

  const teams: Team[] = TEAMS.map((team) => {
    const o = overrides[team.ticker];
    if (!o) return team;
    return {
      ...team,
      tokenAddress: clean(o.address),
      pumpUrl: cleanUrl(o.pumpUrl),
      axiomUrl: cleanUrl(o.axiomUrl),
    };
  });

  const golazoOverride = overrides[GOLAZO_TOKEN.ticker];
  const golazo: TokenInfo = golazoOverride
    ? {
        ...GOLAZO_TOKEN,
        address: clean(golazoOverride.address),
        pumpUrl: cleanUrl(golazoOverride.pumpUrl),
        axiomUrl: cleanUrl(golazoOverride.axiomUrl),
      }
    : GOLAZO_TOKEN;

  return Response.json({ teams, golazo });
}
