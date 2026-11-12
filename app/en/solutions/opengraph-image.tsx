import { SOLUTIONS_OG_ALT, solutionsOg } from "@/components/segments/meta";
import { OG_SIZE } from "@/components/segments/og";

export const alt = SOLUTIONS_OG_ALT.en;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Social card of the /en/solutions index. */
export default function Image() {
  return solutionsOg("en");
}
