import { SOLUTIONS_OG_ALT, solutionsOg } from "@/components/segments/meta";
import { OG_SIZE } from "@/components/segments/og";

export const alt = SOLUTIONS_OG_ALT.pt;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Social card of the /solucoes index. */
export default function Image() {
  return solutionsOg("pt");
}
