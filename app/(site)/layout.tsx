import { RootDocument } from "@/components/layout/RootDocument";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { rootMetadata, VIEWPORT } from "@/lib/i18n/metadata";

export const metadata = rootMetadata("pt");
export const viewport = VIEWPORT;

/**
 * Root layout of the Portuguese site (unprefixed URLs): `<html lang="pt-BR">` and the site chrome.
 * The English site (app/en), the demos and the labs are separate root layouts — see the
 * "Languages" section of docs/design-system.md.
 */
export default function PortugueseSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootDocument lang="pt">
      <SiteChrome lang="pt">{children}</SiteChrome>
    </RootDocument>
  );
}
