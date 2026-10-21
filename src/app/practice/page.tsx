import type { Metadata } from "next";
import { Practice } from "@/components/Practice";
import { getAllStories, getDailyFiles } from "@/content/loader";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  return <Practice stories={getAllStories()} dailyFiles={getDailyFiles()} />;
}
