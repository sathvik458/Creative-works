"use client";

import { useMemo } from "react";
import type { Character, Expression } from "@/content/schema";
import { spriteSvg } from "@/lib/sprite";
import { cx } from "./ui";

/** Character art: real sprite image if provided, otherwise the placeholder SVG. */
export function Sprite({
  character,
  expression = "neutral",
  className,
  silhouette,
  speaking = false,
}: {
  character: Character;
  expression?: Expression;
  className?: string;
  silhouette?: boolean;
  speaking?: boolean;
}) {
  const src = character.sprites?.[expression] ?? character.sprites?.neutral;
  const svg = useMemo(() => (src ? null : spriteSvg(character.look, expression)), [src, character.look, expression]);
  const style = silhouette ? { filter: "brightness(0) opacity(0.35)" } : undefined;

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={character.name} className={cx("object-contain", className)} style={style} draggable={false} />;
  }
  return (
    <div
      role="img"
      aria-label={`${character.name} (${expression})`}
      className={cx("sprite-svg", className)}
      data-speaking={speaking && !silhouette ? "true" : undefined}
      style={style}
      dangerouslySetInnerHTML={{ __html: svg! }}
    />
  );
}
