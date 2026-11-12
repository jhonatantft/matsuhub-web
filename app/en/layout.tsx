import { RootDocument } from "@/components/layout/RootDocument";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { rootMetadata, VIEWPORT } from "@/lib/i18n/metadata";

export const metadata = rootMetadata("en");
export const viewport = VIEWPORT;

/** Root layout of the English site (/en/**): `<html lang="en">` and the same site chrome. */
export default function EnglishSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootDocument lang="en">
      <SiteChrome lang="en">{children}</SiteChrome>
    </RootDocument>
  );
}
