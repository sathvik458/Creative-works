import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurvivalMode } from "@/components/mini/SurvivalMode";
import { getAllStories, getStory } from "@/content/loader";

type Params = { params: Promise<{ storyId: string; episodeId: string }> };

export function generateStaticParams() {
  return getAllStories().flatMap((s) =>
    s.episodes.filter((e) => (e.survival?.length ?? 0) > 0).map((e) => ({ storyId: s.id, episodeId: e.id })),
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { storyId, episodeId } = await params;
  const ep = getStory(storyId)?.episodes.find((e) => e.id === episodeId);
  return ep ? { title: `Survival · ${ep.title}` } : {};
}

export default async function SurvivalPage({ params }: Params) {
  const { storyId, episodeId } = await params;
  const story = getStory(storyId);
  const episode = story?.episodes.find((e) => e.id === episodeId);
  if (!story || !episode?.survival?.length) notFound();
  return <SurvivalMode story={story} episode={episode} />;
}
