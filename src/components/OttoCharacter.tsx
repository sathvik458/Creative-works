"use client";

import { useMemo } from "react";
import { OTTO, ottoAppearance, type Appearance, type OttoOutfit } from "@/lib/characters";
import { RiveCharacter, type CharacterProps } from "./RiveCharacter";

type Props = Omit<CharacterProps, "appearance"> & {
  /** Role he is dressed for. Sets the outfit, its shirt colour and its shirt label. */
  outfit?: OttoOutfit;
  /** What his shirt says, e.g. "STATION MASTER". Defaults to the outfit's label (casual has none). */
  shirtLabel?: string;
  shirtColor?: string;
  skinTone?: string;
  /** Hair, eyebrows and mustache. The Rive file's default is white. */
  hairColor?: string;
  /** On by default. */
  glasses?: boolean;
};

/**
 * Otto, a cheerful grandpa on Tomo's rig (public/rive/otto.riv).
 * <OttoCharacter outfit="station" mood="talking" mouthSource={getMouth} /> or <OttoCharacter outfit="cafe" shirtLabel="BAKERY" />
 */
export function OttoCharacter({ outfit = "casual", shirtLabel, shirtColor, skinTone, hairColor, glasses, ...props }: Props) {
  const appearance: Appearance = useMemo(
    () => ottoAppearance(outfit, { shirtLabel, shirtColor, skinTone, hairColor, glasses }),
    [outfit, shirtLabel, shirtColor, skinTone, hairColor, glasses],
  );
  return <RiveCharacter file={OTTO} appearance={appearance} {...props} />;
}
