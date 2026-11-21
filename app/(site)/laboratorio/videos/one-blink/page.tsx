import { videoMetadata } from "@/components/lab/meta";
import { VideoPage, type VideoData } from "@/components/lab/VideoPage";
import data from "@/content/lab/videos/one-blink.json";

export const metadata = videoMetadata("one-blink", "pt");

export default function Page() {
  return <VideoPage id="one-blink" lang="pt" data={data as VideoData} />;
}
