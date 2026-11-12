import { HOME_OG_ALT, HOME_OG_SIZE, homeOgImage } from "@/components/layout/og";

export const alt = HOME_OG_ALT.pt;
export const size = HOME_OG_SIZE;
export const contentType = "image/png";

/** Social share card at /opengraph-image (the Portuguese homepage has its own copy in app/(site)). */
export default function OpengraphImage() {
  return homeOgImage("pt");
}
