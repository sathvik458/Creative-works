import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryDetail } from "@/components/StoryDetail";
import { getAllStories, getStory } from "@/content/loader";

type Params = { params: Promise<{ storyId: string }> };

export function generateStaticParams() {
  return getAllStories().map((s) => ({ storyId: s.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { storyId } = await params;
  const story = getStory(storyId);
  return story ? { title: story.title, description: story.synopsis } : {};
}

export default async function StoryPage({ params }: Params) {
  const { storyId } = await params;
  const story = getStory(storyId);
  if (!story) notFound();
  return <StoryDetail story={story} />;
}
