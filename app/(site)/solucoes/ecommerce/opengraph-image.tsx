import { OG_SIZE } from "@/components/segments/og";
import { SEGMENT_OG_ALT, segmentOg } from "@/components/segments/meta";

export const alt = SEGMENT_OG_ALT.pt;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return segmentOg("ecommerce");
}
