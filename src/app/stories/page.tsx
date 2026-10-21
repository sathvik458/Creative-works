import { Library } from "@/components/Library";
import { getAllStories, getDailyFiles } from "@/content/loader";
export default function Page() {
  return (
    <Library
      stories={getAllStories()}
      dailyLanguages={Object.keys(getDailyFiles())}
    />
  );
}
