"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePreview } from "@/store/preview";
import { stopSpeaking } from "@/lib/audio";
import { useGame, useHydrated } from "@/store/game";

/**
 * Applies accessibility preferences to <html> as data attributes
 * (text size, reduced motion, high contrast). CSS in globals.css does the rest.
 */
export function Preferences() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const theme = usePreview((s) => s.theme);
  useEffect(() => {
    stopSpeaking();
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.appearance = theme;
  }, [theme]);
  const textSize = useGame((s) => s.settings.textSize);
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  const highContrast = useGame((s) => s.settings.highContrast);

  useEffect(() => {
    if (!hydrated) return;
    const el = document.documentElement;
    el.dataset.text = textSize;
    el.dataset.motion = reduceMotion ? "reduce" : "full";
    el.dataset.contrast = highContrast ? "high" : "normal";
  }, [hydrated, textSize, reduceMotion, highContrast]);

  return null;
}
