import { describe, it, expect } from "vitest";
import { stadiumName } from "@/lib/venues";
import { SCHEDULE } from "@/constants/schedule";

describe("stadiumName", () => {
  it("maps host cities to stadium names", () => {
    expect(stadiumName("Inglewood")).toBe("SoFi Stadium");
    expect(stadiumName("Mexico City")).toBe("Estadio Azteca");
    expect(stadiumName("East Rutherford")).toBe("MetLife Stadium");
  });

  it("falls back to the raw value for anything unmapped", () => {
    expect(stadiumName("Atlantis")).toBe("Atlantis");
  });

  it("covers every venue used in the schedule", () => {
    const cities = new Set(SCHEDULE.map((m) => m.venue));
    for (const city of Array.from(cities)) {
      // mapped (changed) — none of the real host cities should fall through
      expect(stadiumName(city)).not.toBe(city);
    }
  });
});
