import { describe, expect, it } from "vitest";
import { isInNyc, NYC_BOROUGHS } from "@cozy/shared/geo";

describe("isInNyc", () => {
  it("has the five boroughs", () => {
    expect(NYC_BOROUGHS.features.map((f) => f.properties.boroname).sort()).toEqual(["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]);
  });
  it("knows land from water and New Jersey", () => {
    expect(isInNyc(-73.9857, 40.7484)).toBe(true); // Empire State Building
    expect(isInNyc(-73.9442, 40.6782)).toBe(true); // Brooklyn
    expect(isInNyc(-74.0776, 40.7282)).toBe(false); // Jersey City
    expect(isInNyc(-73.9742, 40.7118)).toBe(false); // East River
    expect(isInNyc(-73.7949, 40.6413)).toBe(true); // JFK, Queens
  });
});
