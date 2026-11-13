import { OG_SIZE } from "@/components/segments/og";
import { labItemOg } from "@/components/lab/meta";
import { labById } from "@/content/lab";

export const alt = `${labById("next-word").title.pt} ${labById("next-word").accent.pt} — Lab MatsuHub`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return labItemOg("next-word", "pt");
}
