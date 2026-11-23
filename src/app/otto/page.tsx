import type { Metadata } from "next";
import { CharacterPreview } from "@/components/CharacterPreview";

export const metadata: Metadata = { title: "Otto preview" };

export default function OttoPage() {
  return <CharacterPreview character="otto" />;
}
