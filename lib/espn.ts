// Thin client for ESPN's public (unofficial) soccer API. No key required. The
// FIFA men's World Cup lives under the "fifa.world" league slug. Endpoints are
// undocumented and carry no SLA — fine for the player pool and as the day-to-day
// stats source, with the admin manual override as the backstop.

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

export async function espnGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
  return (await res.json()) as T;
}

/** Run async work over items with limited concurrency (be gentle on ESPN). */
export async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
