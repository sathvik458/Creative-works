import type { Metadata } from "next";
import { Notebook } from "@/components/Notebook";
import { getAllStories } from "@/content/loader";

export const metadata: Metadata = { title: "Notebook" };

export default function NotebookPage() {
  return <Notebook stories={getAllStories()} />;
}
