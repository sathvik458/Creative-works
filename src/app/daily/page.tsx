import type { Metadata } from "next";
import { DailyChallenge } from "@/components/mini/DailyChallenge";
import { getDailyFiles } from "@/content/loader";

export const metadata: Metadata = { title: "Daily Challenge" };

export default function DailyPage() {
  return <DailyChallenge files={getDailyFiles()} />;
}
