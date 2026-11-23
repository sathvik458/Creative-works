import type { Metadata } from "next";
import { CharacterPreview } from "@/components/CharacterPreview";

export const metadata: Metadata = { title: "Yap preview" };

export default function YapPage() {
  return <CharacterPreview character="yap" />;
}
