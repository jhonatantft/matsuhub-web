import { OG_SIZE } from "@/components/segments/og";
import { customOg } from "@/components/segments/meta";
import { CUSTOM } from "@/content/custom";

export const alt = CUSTOM.meta.ogAlt.en;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return customOg("en");
}
