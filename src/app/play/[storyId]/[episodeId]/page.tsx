import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Player } from "@/components/player/Player";
import { getAllStories, getStory } from "@/content/loader";

type Params = { params: Promise<{ storyId: string; episodeId: string }> };

export function generateStaticParams() {
  return getAllStories().flatMap((s) => s.episodes.map((e) => ({ storyId: s.id, episodeId: e.id })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { storyId, episodeId } = await params;
  const ep = getStory(storyId)?.episodes.find((e) => e.id === episodeId);
  return ep ? { title: ep.title } : {};
}

export default async function PlayPage({ params }: Params) {
  const { storyId, episodeId } = await params;
  const story = getStory(storyId);
  const episode = story?.episodes.find((e) => e.id === episodeId);
  if (!story || !episode) notFound();
  return (
    <div className="min-h-dvh bg-[#1d1830]">
      <Player story={story} episode={episode} />
    </div>
  );
}
