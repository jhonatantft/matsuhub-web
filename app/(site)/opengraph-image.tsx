import { HOME_OG_ALT, HOME_OG_SIZE, homeOgImage } from "@/components/layout/og";

export const alt = HOME_OG_ALT.pt;
export const size = HOME_OG_SIZE;
export const contentType = "image/png";

/**
 * Social card of the Portuguese homepage. The homepage sets its own Open Graph fields (canonical,
 * hreflang), which would drop the app-level card, so the card sits next to the page as on /en.
 * app/opengraph-image.tsx stays for the /opengraph-image URL and pages without their own card.
 */
export default function OpengraphImage() {
  return homeOgImage("pt");
}
