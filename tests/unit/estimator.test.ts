import { describe, expect, it } from "vitest";
import { estimateFlightUsd, haversineKm, roomsFor, seasonMultiplier } from "@/lib/travel/estimator";

describe("estimator", () => {
  it("computes great-circle distance", () => {
    const sydney = { latitude: -33.946, longitude: 151.177 };
    const bali = { latitude: -8.748, longitude: 115.167 };
    const km = haversineKm(sydney, bali);
    expect(km).toBeGreaterThan(4500);
    expect(km).toBeLessThan(4800);
  });

  it("scales flight estimates with distance and style", () => {
    expect(estimateFlightUsd(1000)).toBeLessThan(estimateFlightUsd(9000));
    expect(estimateFlightUsd(5000, "LUXURY")).toBeGreaterThan(estimateFlightUsd(5000, "BUDGET"));
  });

  it("assumes two travellers per room", () => {
    expect(roomsFor(1)).toBe(1);
    expect(roomsFor(2)).toBe(1);
    expect(roomsFor(3)).toBe(2);
    expect(roomsFor(5)).toBe(3);
  });

  it("raises prices in peak season and lowers them in low season", () => {
    const d = { bestMonths: [6], avoidMonths: [2] };
    expect(seasonMultiplier(d, 6)).toBeGreaterThan(seasonMultiplier(d, 4));
    expect(seasonMultiplier(d, 2)).toBeLessThan(seasonMultiplier(d, 4));
  });
});
