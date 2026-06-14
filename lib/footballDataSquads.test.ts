import { describe, it, expect } from "vitest";
import { mapPosition } from "@/lib/footballDataSquads";

describe("mapPosition", () => {
  it("maps keepers", () => {
    expect(mapPosition("Goalkeeper")).toBe("GK");
  });

  it("maps defenders", () => {
    expect(mapPosition("Centre-Back")).toBe("DEF");
    expect(mapPosition("Left-Back")).toBe("DEF");
    expect(mapPosition("Defender")).toBe("DEF");
  });

  it("treats all midfield variants — and wingers — as MID", () => {
    expect(mapPosition("Central Midfield")).toBe("MID");
    expect(mapPosition("Defensive Midfield")).toBe("MID");
    expect(mapPosition("Attacking Midfield")).toBe("MID");
    expect(mapPosition("Left Winger")).toBe("MID");
  });

  it("maps forwards", () => {
    expect(mapPosition("Centre-Forward")).toBe("FWD");
    expect(mapPosition("Striker")).toBe("FWD");
    expect(mapPosition("Offence")).toBe("FWD");
  });

  it("defaults unknown/blank to MID rather than dropping the player", () => {
    expect(mapPosition(null)).toBe("MID");
    expect(mapPosition("")).toBe("MID");
    expect(mapPosition("Utility")).toBe("MID");
  });
});
