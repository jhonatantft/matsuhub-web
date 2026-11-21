import { OG_SIZE } from "@/components/segments/og";
import { videoOg } from "@/components/lab/meta";
import { videoById } from "@/content/lab/videos";

export const alt = `${videoById("one-blink").series} — ${videoById("one-blink").title.en} ${videoById("one-blink").accent.en}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return videoOg("one-blink", "en");
}
