"use client";

import { useMemo } from "react";
import { TOMO, tomoAppearance, type Appearance, type TomoOutfit } from "@/lib/characters";
import { RiveCharacter, type CharacterProps } from "./RiveCharacter";

type Props = Omit<CharacterProps, "appearance"> & {
  /** Role he is dressed for. Sets the outfit, its shirt colour and its shirt label. */
  outfit?: TomoOutfit;
  /** What his shirt says, e.g. "TOUR GUIDE". Defaults to the outfit's label. */
  shirtLabel?: string;
  shirtColor?: string;
  skinTone?: string;
  hairColor?: string;
  glasses?: boolean;
};

/**
 * Tomo, a friendly human guide who can play any role (public/rive/tomo.riv).
 * <TomoCharacter outfit="police" mood="listening" /> or <TomoCharacter outfit="shop" shirtLabel="BOOKSHOP" />
 */
export function TomoCharacter({ outfit = "casual", shirtLabel, shirtColor, skinTone, hairColor, glasses, ...props }: Props) {
  const appearance: Appearance = useMemo(
    () => tomoAppearance(outfit, { shirtLabel, shirtColor, skinTone, hairColor, glasses }),
    [outfit, shirtLabel, shirtColor, skinTone, hairColor, glasses],
  );
  return <RiveCharacter file={TOMO} appearance={appearance} {...props} />;
}
