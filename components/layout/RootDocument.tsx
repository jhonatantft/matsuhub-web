import "@/app/globals.css";
import { Cormorant, Fraunces, JetBrains_Mono, Lexend, Manrope, Sora, Unbounded } from "next/font/google";
import { Ambient } from "@/components/layout/Ambient";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { HTML_LANG, type Lang } from "@/lib/i18n/core";

const display = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Serif for the "Aurora" demo only — not preloaded, so other pages don't pay for it.
const aurora = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false });
// Serif for the "Maré" restaurant demo only.
const mare = Cormorant({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});
// Geometric sans for the "Pulso" online-store demo only.
const pulso = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap", preload: false });
// Readable humanist sans for the "Elo" clinic demo only.
const elo = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap", preload: false });

const FONTS = [display, sans, mono, aurora, mare, pulso, elo].map((font) => font.variable).join(" ");

/**
 * The <html> document shared by every root layout: app/(site) (Portuguese site), app/en (English
 * site), app/demos and app/lab. Each tree is its own root layout so `<html lang>` is right in the
 * static HTML; this keeps the fonts, global CSS and ambient layers identical across them.
 */
export function RootDocument({
  lang,
  head,
  children,
}: {
  lang: Lang;
  /** Extra <head> content (app/global-not-found sets its language from the URL before paint). */
  head?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <html lang={HTML_LANG[lang]} className={FONTS} suppressHydrationWarning={!!head}>
      {head && (
        // eslint-disable-next-line @next/next/no-head-element -- App Router root layout: Next merges the metadata into it
        <head>{head}</head>
      )}
      <body>
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <Ambient />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
