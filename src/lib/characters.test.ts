import { describe, expect, it } from "vitest";
import { OTTO_OUTFITS, TOMO_OUTFITS, cleanShirtLabel, hexToRgb, ottoAppearance, tomoAppearance } from "./characters";

describe("Tomo outfits", () => {
  it("numbers outfits in the same order as the Rive file", () => {
    expect(Object.entries(TOMO_OUTFITS).map(([name, o]) => [name, o.index])).toEqual([
      ["casual", 0],
      ["police", 1],
      ["station", 2],
      ["cafe", 3],
      ["shop", 4],
    ]);
  });

  it("uses the outfit's defaults", () => {
    expect(tomoAppearance("police")).toMatchObject({ outfit: 1, shirtLabel: "POLICE", shirtColor: "#24345a", glasses: false });
  });

  it("lets the app override the label and colours", () => {
    const look = tomoAppearance("station", { shirtLabel: " station  master ", shirtColor: "#35765d", glasses: true });
    expect(look).toMatchObject({ outfit: 2, shirtLabel: "STATION MASTER", shirtColor: "#35765d", glasses: true });
  });
});

describe("Otto outfits", () => {
  it("shares Tomo's outfit numbers and uniforms", () => {
    for (const name of Object.keys(TOMO_OUTFITS) as (keyof typeof TOMO_OUTFITS)[]) {
      expect(OTTO_OUTFITS[name].index).toBe(TOMO_OUTFITS[name].index);
    }
    expect(OTTO_OUTFITS.station).toEqual(TOMO_OUTFITS.station);
  });

  it("wears a plain cardigan and his glasses by default", () => {
    expect(ottoAppearance("casual")).toMatchObject({ outfit: 0, shirtLabel: "", shirtColor: "#d9a441", glasses: true });
  });

  it("can take his glasses off and wear a custom label", () => {
    expect(ottoAppearance("station", { glasses: false, shirtLabel: "guard" })).toMatchObject({
      outfit: 2,
      shirtLabel: "GUARD",
      glasses: false,
    });
  });
});

describe("cleanShirtLabel", () => {
  it("upper-cases, collapses spaces and caps the length", () => {
    expect(cleanShirtLabel("  tour   guide ")).toBe("TOUR GUIDE");
    expect(cleanShirtLabel("a very long shirt label")).toHaveLength(16);
  });
});

describe("hexToRgb", () => {
  it("parses six-digit hex colours", () => {
    expect(hexToRgb("#ff9f43")).toEqual([255, 159, 67]);
    expect(hexToRgb("24345A")).toEqual([36, 52, 90]);
  });

  it("rejects anything else", () => {
    expect(hexToRgb("#fff")).toBeNull();
    expect(hexToRgb("orange")).toBeNull();
    expect(hexToRgb(undefined)).toBeNull();
  });
});
