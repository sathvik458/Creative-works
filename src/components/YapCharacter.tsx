"use client";

import { YAP } from "@/lib/characters";
import { RiveCharacter, type CharacterMood, type CharacterProps, type CharacterReaction } from "./RiveCharacter";

export type YapMood = CharacterMood;
export type YapReaction = CharacterReaction;

/** Yap, the Yap & Learn mascot (public/rive/yap.riv). */
export function YapCharacter(props: Omit<CharacterProps, "appearance">) {
  return <RiveCharacter file={YAP} {...props} />;
}
