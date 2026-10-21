import { Speak } from "@/components/flow/Speak";
import { getAllStories } from "@/content/loader";
export default function Page() {
  return <Speak stories={getAllStories()} />;
}
