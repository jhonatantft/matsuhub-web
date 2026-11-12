import type { Metadata, Viewport } from "next";
import { SITE } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import { OG_LOCALE, otherLang, t, type Lang } from "./core";
import { pageAlternates, pagePath, type PageKey } from "./routes";

export const VIEWPORT: Viewport = { themeColor: "#050807", colorScheme: "dark" };

/** Defaults every page of a root layout inherits (title template, description, Open Graph). */
export function rootMetadata(lang: Lang): Metadata {
  const title = t(SITE.title, lang);
  const description = t(SITE.description, lang);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${SITE.name}` },
    description,
    openGraph: { type: "website", locale: OG_LOCALE[lang], siteName: SITE.name, title, description },
    twitter: { card: "summary_large_image" },
  };
}

/**
 * Metadata of a page that exists in both languages: canonical, hreflang alternates and Open Graph
 * (the og:image comes from the route's opengraph-image file). Without `copy`, the site defaults.
 */
export function pageMetadata(key: PageKey, lang: Lang, copy?: { title: string; description: string }): Metadata {
  const title = copy?.title ?? t(SITE.title, lang);
  const description = copy?.description ?? t(SITE.description, lang);
  const url = pagePath(key, lang);
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(key, lang),
    openGraph: {
      type: "website",
      locale: OG_LOCALE[lang],
      alternateLocale: OG_LOCALE[otherLang(lang)],
      siteName: SITE.name,
      url,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
