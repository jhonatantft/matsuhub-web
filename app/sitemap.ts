import type { MetadataRoute } from "next";
import { DEMOS } from "@/content/site";
import { LANGS } from "@/lib/i18n/core";
import { languageAlternates, PAGE_KEYS, pagePath, type PageKey } from "@/lib/i18n/routes";
import { siteUrl } from "@/lib/site-url";

const base = siteUrl();

const PRIORITY: Record<PageKey, number> = {
  home: 1,
  solutions: 0.9,
  imobiliarias: 0.9,
  restaurantes: 0.9,
  ecommerce: 0.9,
  clinicas: 0.9,
};

/**
 * Every bilingual page twice (Portuguese and English), each listing both versions as hreflang
 * alternates (pt-BR, en, x-default = Portuguese); then the Portuguese-only demos.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = PAGE_KEYS.flatMap((key) =>
    LANGS.map((lang) => ({
      url: `${base}${pagePath(key, lang)}`,
      changeFrequency: "monthly" as const,
      priority: PRIORITY[key],
      alternates: { languages: languageAlternates(key, base) },
    })),
  );
  const demos = DEMOS.map((demo) => ({ url: `${base}${demo.href}`, changeFrequency: "monthly" as const, priority: 0.8 }));
  return [...pages, ...demos];
}
