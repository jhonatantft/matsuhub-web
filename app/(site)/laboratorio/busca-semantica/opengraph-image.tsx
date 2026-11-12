import { OG_SIZE } from "@/components/segments/og";
import { labItemOg } from "@/components/lab/meta";
import { labById } from "@/content/lab";

export const alt = `${labById("semantic-search").title.pt} ${labById("semantic-search").accent.pt} — Lab MatsuHub`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return labItemOg("semantic-search", "pt");
}
