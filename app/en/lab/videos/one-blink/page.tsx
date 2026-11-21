import { videoMetadata } from "@/components/lab/meta";
import { VideoPage, type VideoData } from "@/components/lab/VideoPage";
import data from "@/content/lab/videos/one-blink.json";

export const metadata = videoMetadata("one-blink", "en");

export default function Page() {
  return <VideoPage id="one-blink" lang="en" data={data as VideoData} />;
}
