import type { Metadata } from "next";
import { CharacterPreview } from "@/components/CharacterPreview";

export const metadata: Metadata = { title: "Tomo preview" };

export default function TomoPage() {
  return <CharacterPreview character="tomo" />;
}
