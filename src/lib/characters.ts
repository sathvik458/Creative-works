/**
 * Rive characters the app can show, and the outfits Tomo and Otto share.
 * The names here match the Rive files (see docs/rive/RIVE_BUILD_GUIDE.md, TOMO_RIVE_GUIDE.md and OTTO_RIVE_GUIDE.md).
 */

export type CharacterFile = {
  /** public/ path of the exported .riv */
  src: string;
  /** still image shown until the .riv exists, or if it fails to load */
  still: string;
  artboard: string;
  viewModel: string;
  label: string;
};

export const YAP: CharacterFile = {
  src: "/rive/yap.riv",
  still: "/rive/yap.svg",
  artboard: "Yap",
  viewModel: "Yap",
  label: "Yap, the Yap & Learn mascot",
};

export const TOMO: CharacterFile = {
  src: "/rive/tomo.riv",
  still: "/rive/tomo.svg",
  artboard: "Tomo",
  viewModel: "Tomo",
  label: "Tomo, a friendly guide",
};

export const OTTO: CharacterFile = {
  src: "/rive/otto.riv",
  still: "/rive/otto.svg",
  artboard: "Otto",
  viewModel: "Otto",
  label: "Otto, a cheerful grandpa",
};

/** Optional look properties. A character's Rive file ignores any it doesn't have (Yap has none). */
export type Appearance = {
  outfit?: number;
  shirtLabel?: string;
  shirtColor?: string;
  skinTone?: string;
  hairColor?: string;
  glasses?: boolean;
};

/** Tomo and Otto share one rig, so they have the same outfits in the same order. */
export type Outfit = "casual" | "police" | "station" | "cafe" | "shop";
export type TomoOutfit = Outfit;
export type OttoOutfit = Outfit;
export type OutfitTable = Record<Outfit, { index: number; shirtColor: string; label: string }>;

/** Order matches the Rive `outfit` number. Each outfit's default shirt colour and label. */
export const TOMO_OUTFITS: OutfitTable = {
  casual: { index: 0, shirtColor: "#ff9f43", label: "HELLO" },
  police: { index: 1, shirtColor: "#24345a", label: "POLICE" },
  station: { index: 2, shirtColor: "#1f4f7a", label: "STATION HEAD" },
  cafe: { index: 3, shirtColor: "#fbf3e6", label: "CAFÉ" },
  shop: { index: 4, shirtColor: "#f4f6f2", label: "STAFF" },
};

/** Otto's uniforms match Tomo's; his casual look is a mustard cardigan with nothing printed on it. */
export const OTTO_OUTFITS: OutfitTable = {
  ...TOMO_OUTFITS,
  casual: { index: 0, shirtColor: "#d9a441", label: "" },
};

export const SHIRT_LABEL_MAX = 16;

/** Shirt labels are upper-case and short so they fit the chest patch. */
export function cleanShirtLabel(text: string): string {
  return text.trim().replace(/\s+/g, " ").toUpperCase().slice(0, SHIRT_LABEL_MAX);
}

type LookOverrides = Omit<Appearance, "outfit">;

function outfitAppearance(table: OutfitTable, outfit: Outfit, overrides: LookOverrides, glasses: boolean): Appearance {
  const o = table[outfit];
  return {
    outfit: o.index,
    shirtLabel: cleanShirtLabel(overrides.shirtLabel ?? o.label),
    shirtColor: overrides.shirtColor ?? o.shirtColor,
    skinTone: overrides.skinTone,
    hairColor: overrides.hairColor,
    glasses: overrides.glasses ?? glasses,
  };
}

/** Full appearance for Tomo in an outfit; anything in `overrides` wins over the outfit's defaults. */
export function tomoAppearance(outfit: TomoOutfit, overrides: LookOverrides = {}): Appearance {
  return outfitAppearance(TOMO_OUTFITS, outfit, overrides, false);
}

/** Same for Otto, who wears his glasses unless told otherwise. */
export function ottoAppearance(outfit: OttoOutfit, overrides: LookOverrides = {}): Appearance {
  return outfitAppearance(OTTO_OUTFITS, outfit, overrides, true);
}

/** "#ff9f43" → [255, 159, 67]; anything else → null. */
export function hexToRgb(hex: string | undefined): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
