import { HOME_OG_ALT, HOME_OG_SIZE, homeOgImage } from "@/components/layout/og";

export const alt = HOME_OG_ALT.en;
export const size = HOME_OG_SIZE;
export const contentType = "image/png";

/** Social share card of the English site (and of every /en page without its own). */
export default function OpengraphImage() {
  return homeOgImage("en");
}
