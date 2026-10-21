"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage } from "./storage";
export type Bookmark = {
  id: string;
  text: string;
  source: string;
  href: string;
  lang: string;
};
export type Note = {
  id: string;
  title: string;
  text: string;
  updatedAt: number;
};
type Preview = {
  name: string;
  email: string;
  mobile: string;
  signedIn: boolean;
  englishLevel: string;
  japaneseLevel: string;
  interfaceLanguage: string;
  reminder: boolean;
  reminderTime: string;
  theme: "light" | "dark";
  bookmarks: Bookmark[];
  notes: Note[];
  update: (
    patch: Partial<
      Omit<Preview, "update" | "bookmark" | "saveNote" | "removeNote">
    >,
  ) => void;
  bookmark: (item: Bookmark) => void;
  saveNote: (note: Note) => void;
  removeNote: (id: string) => void;
};
export const usePreview = create<Preview>()(
  persist(
    (set) => ({
      name: "",
      email: "",
      mobile: "",
      signedIn: false,
      englishLevel: "A1",
      japaneseLevel: "N5",
      interfaceLanguage: "en",
      reminder: false,
      reminderTime: "19:00",
      theme: "light",
      bookmarks: [],
      notes: [],
      update: (patch) => set(patch),
      bookmark: (item) =>
        set((s) => ({
          bookmarks: s.bookmarks.some((b) => b.id === item.id)
            ? s.bookmarks.filter((b) => b.id !== item.id)
            : [item, ...s.bookmarks],
        })),
      saveNote: (note) =>
        set((s) => ({
          notes: [note, ...s.notes.filter((n) => n.id !== note.id)],
        })),
      removeNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    {
      name: "language-stories:ui-preview:v1",
      storage: createJSONStorage(() => storage),
      skipHydration: true,
    },
  ),
);
export const proficiencyLevels = {
  en: ["A1", "A2", "B1", "B2", "C1", "C2"],
  ja: ["N5", "N4", "N3", "N2", "N1"],
};
