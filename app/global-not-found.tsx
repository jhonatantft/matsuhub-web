import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";
import { RootDocument } from "@/components/layout/RootDocument";
import { rootMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = { ...rootMetadata("pt"), title: { absolute: "404 · MatsuHub" } };

/**
 * Before the first paint, an /en/** address switches the document to English (`<html lang="en">`)
 * and the CSS below shows the English block. Without JavaScript the Portuguese one stays.
 */
const PICK_LANGUAGE = `if(/^\\/en(\\/|$)/.test(location.pathname))document.documentElement.lang="en"`;
const CSS = `html[lang="en"] .nf-pt{display:none}html:not([lang="en"]) .nf-en{display:none}`;

/**
 * The 404 of every unmatched URL (Next serves it with status 404). The site has several root
 * layouts — one per language, plus the demos and the labs — so there is no single layout to hold
 * a not-found page; this one is a whole document, in Portuguese and English.
 */
export default function GlobalNotFound() {
  return (
    <RootDocument
      lang="pt"
      head={
        <>
          <script dangerouslySetInnerHTML={{ __html: PICK_LANGUAGE }} />
          <style>{CSS}</style>
        </>
      }
    >
      <main className="relative z-10">
        <div className="nf-pt">
          <NotFoundView lang="pt" />
        </div>
        <div className="nf-en" lang="en">
          <NotFoundView lang="en" />
        </div>
      </main>
    </RootDocument>
  );
}
