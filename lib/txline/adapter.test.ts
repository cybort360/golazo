import { describe, it, expect } from "vitest";
import { MockTxlineAdapter } from "@/lib/txline/adapter";

describe("MockTxlineAdapter", () => {
  const a = new MockTxlineAdapter();

  it("streams kickoff → 90 minutes → ft", () => {
    const e = a.liveEvents("ABLRVR");
    expect(e[0].type).toBe("kickoff");
    expect(e.at(-1)!.type).toBe("ft");
    expect(e.filter((x) => x.type === "goal")).toHaveLength(3);
  });

  it("resolves a 2-1 home win into binary stats", () => {
    const r = a.result("ABLRVR");
    expect(r.stats.home_win).toBe(1);
    expect(r.stats.over25).toBe(1); // 3 goals > 2.5
    expect(r.stats.btts).toBe(1); // 2-1, both scored
    expect(r.voided).toBe(false);
  });
});
