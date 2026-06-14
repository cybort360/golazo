import { describe, it, expect } from "vitest";
import { autoLineup } from "@/lib/fpl/autoLineup";
import { validateLineup } from "@/lib/fpl/squad";
import type { FplPlayer, Position } from "@/lib/fpl/types";

const COMPOSITION: Position[] = [
  "GK", "GK",
  "DEF", "DEF", "DEF", "DEF", "DEF",
  "MID", "MID", "MID", "MID", "MID",
  "FWD", "FWD", "FWD",
];
const pool: FplPlayer[] = COMPOSITION.map((position, i) => ({
  id: `p${i}`,
  name: `p${i}`,
  team: `T${i % 5}`,
  position,
  price: 10 - i * 0.1, // descending so ordering is determinate
}));
const byId = new Map(pool.map((p) => [p.id, p]));
const lookup = (id: string) => byId.get(id);
const squad = pool.map((p) => p.id);

describe("autoLineup", () => {
  const lineup = autoLineup(squad, lookup);

  it("produces a legal lineup against the squad", () => {
    expect(validateLineup(lineup, squad, lookup)).toEqual({ ok: true });
  });

  it("fields a 3-4-3 with one keeper", () => {
    const count = (pos: Position) =>
      lineup.starters.filter((id) => lookup(id)?.position === pos).length;
    expect(count("GK")).toBe(1);
    expect(count("DEF")).toBe(3);
    expect(count("MID")).toBe(4);
    expect(count("FWD")).toBe(3);
  });

  it("captains the priciest starter and gives a distinct vice", () => {
    expect(lineup.captain).toBe("p0"); // highest price
    expect(lineup.viceCaptain).not.toBe(lineup.captain);
  });
});
