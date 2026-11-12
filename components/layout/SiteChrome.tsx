import { CursorGlow } from "@/components/layout/CursorGlow";
import { Footer } from "@/components/layout/Footer";
import { LangSync } from "@/components/layout/LangSync";
import { Nav } from "@/components/layout/Nav";
import type { Lang } from "@/lib/i18n/core";

/** MatsuHub site chrome around every page of one language. Demo sites under /demos bring their own. */
export function SiteChrome({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <>
      <LangSync lang={lang} />
      <CursorGlow />
      <Nav lang={lang} />
      <main className="relative z-10 overflow-x-clip">{children}</main>
      <Footer lang={lang} />
    </>
  );
}
