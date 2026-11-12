import type { Metadata } from "next";
import { fill, SEGMENT_LIST, SEGMENT_UI, segmentById, t, type Lang, type SegmentId } from "@/content/segments";
import { pageMetadata } from "@/lib/i18n/metadata";
import { segmentOgImage } from "./og";

/**
 * Helpers for the route files under app/(site)/solucoes/<slug> and app/en/solutions/<slug>: one
 * static folder per segment and language (no `params`, so every page is a fully static shell),
 * each a few lines long. Canonical, hreflang (pt-BR, en, x-default) and Open Graph per language.
 */
export function segmentMetadata(id: SegmentId, lang: Lang = "pt"): Metadata {
  const segment = segmentById(id);
  return pageMetadata(id, lang, { title: t(segment.meta.title, lang), description: t(segment.meta.description, lang) });
}

/** The /solucoes · /en/solutions index. */
export function solutionsMetadata(lang: Lang): Metadata {
  return pageMetadata("solutions", lang, {
    title: t(SEGMENT_UI.index.metaTitle, lang),
    description: t(SEGMENT_UI.index.metaDescription, lang),
  });
}

export const SOLUTIONS_OG_ALT = {
  pt: "MatsuHub — sites e agentes de IA por segmento",
  en: "MatsuHub — websites and AI agents by industry",
};

/** The index's social card. */
export function solutionsOg(lang: Lang) {
  return segmentOgImage({
    kicker: t(SEGMENT_UI.og.indexKicker, lang),
    title: t(SEGMENT_UI.index.title, lang),
    accent: t(SEGMENT_UI.index.accent, lang),
    chips: SEGMENT_LIST.map((segment) => t(segment.name, lang)),
  });
}

export const SEGMENT_OG_ALT = {
  pt: "MatsuHub — site com agente de IA para o seu segmento",
  en: "MatsuHub — a website with an AI agent for your industry",
};

/** The segment's social card, from the page's own headline. */
export function segmentOg(id: SegmentId, lang: Lang = "pt") {
  const segment = segmentById(id);
  return segmentOgImage({
    kicker: fill(t(SEGMENT_UI.og.kicker, lang), { segment: t(segment.name, lang).toLowerCase() }),
    title: t(segment.hero.title, lang),
    accent: t(segment.hero.accent, lang),
    chips: segment.hero.chips.map((chip) => t(chip, lang)),
  });
}
