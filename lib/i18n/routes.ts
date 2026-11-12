import { SEGMENT_HREFS, SEGMENT_IDS, type SegmentId } from "@/content/segments";
import { HTML_LANG, LANGS, type Lang } from "./core";
import { HOME_PATH } from "./sections";

/**
 * The pages that exist in both languages and how they map onto each other: the language
 * switcher, hreflang alternates and the sitemap all read this. Demos, labs and APIs are
 * single-language and stay out of it.
 */
export type PageKey = "home" | "solutions" | "custom" | SegmentId;
export const PAGE_KEYS: readonly PageKey[] = ["home", "solutions", ...SEGMENT_IDS, "custom"];

export function pagePath(key: PageKey, lang: Lang): string {
  if (key === "home") return HOME_PATH[lang];
  if (key === "solutions") return SEGMENT_HREFS[lang].index;
  if (key === "custom") return SEGMENT_HREFS[lang].custom;
  return SEGMENT_HREFS[lang].segment(key);
}

const trim = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

/** Which bilingual page a pathname is, if any. */
export function pageKeyOf(pathname: string): PageKey | null {
  const path = trim(pathname);
  for (const key of PAGE_KEYS) for (const lang of LANGS) if (pagePath(key, lang) === path) return key;
  return null;
}

/** Where the switcher sends a visitor: the same page in `to`, or that language's homepage. */
export function switchPath(pathname: string, to: Lang): string {
  const key = pageKeyOf(pathname);
  return key ? pagePath(key, to) : HOME_PATH[to];
}

/** hreflang map of a page: pt-BR, en and x-default (= the Portuguese URL). `base` makes them absolute. */
export function languageAlternates(key: PageKey, base = ""): Record<string, string> {
  return {
    [HTML_LANG.pt]: `${base}${pagePath(key, "pt")}`,
    [HTML_LANG.en]: `${base}${pagePath(key, "en")}`,
    "x-default": `${base}${pagePath(key, "pt")}`,
  };
}

/** `alternates` for a page's metadata: its own canonical plus every language. */
export const pageAlternates = (key: PageKey, lang: Lang) => ({
  canonical: pagePath(key, lang),
  languages: languageAlternates(key),
});
