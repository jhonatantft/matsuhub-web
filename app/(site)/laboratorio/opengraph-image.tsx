import { OG_SIZE } from "@/components/segments/og";
import { labIndexOg } from "@/components/lab/meta";
import { LAB_UI } from "@/content/lab";

export const alt = LAB_UI.og.alt.pt;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return labIndexOg("pt");
}
