import { SEGMENT_OG_ALT, segmentOg } from "@/components/segments/meta";
import { OG_SIZE } from "@/components/segments/og";

export const alt = SEGMENT_OG_ALT.en;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return segmentOg("ecommerce", "en");
}
