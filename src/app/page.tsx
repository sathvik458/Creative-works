import { Dashboard } from "@/components/flow/Dashboard";
import { getAllStories } from "@/content/loader";
export default function HomePage() {
  return <Dashboard stories={getAllStories()} />;
}
