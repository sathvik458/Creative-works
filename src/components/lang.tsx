"use client";

import { createContext, useContext, type ReactNode } from "react";
import { langMeta, type LangMeta } from "@/lib/lang";

type LangValue = { meta: LangMeta; speech: string };

const LangContext = createContext<LangValue>({ meta: langMeta("ja"), speech: langMeta("ja").speech });

/** Sets the target language (and speech voice) for everything inside, e.g. Listen buttons. */
export function LangProvider({ lang, speech, children }: { lang: string; speech?: string; children: ReactNode }) {
  const meta = langMeta(lang);
  return <LangContext.Provider value={{ meta, speech: speech ?? meta.speech }}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  return useContext(LangContext);
}
