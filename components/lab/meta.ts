import type { Metadata } from "next";
import { segmentOgImage } from "@/components/segments/og";
import { LAB_ITEMS, LAB_UI, labById, type LabId } from "@/content/lab";
import { t, type Lang } from "@/lib/i18n/core";
import { pageMetadata } from "@/lib/i18n/metadata";

/** Helpers for the route files under app/(site)/laboratorio and app/en/lab (one static folder per page). */
export function labIndexMetadata(lang: Lang): Metadata {
  return pageMetadata("lab", lang, { title: t(LAB_UI.index.metaTitle, lang), description: t(LAB_UI.index.metaDescription, lang) });
}

export function labItemMetadata(id: LabId, lang: Lang): Metadata {
  const item = labById(id);
  return pageMetadata(id, lang, {
    title: `${t(item.title, lang)} ${t(item.accent, lang)} · Lab MatsuHub`,
    description: t(item.summary, lang),
  });
}

export function labIndexOg(lang: Lang) {
  return segmentOgImage({
    kicker: t(LAB_UI.og.index, lang),
    title: t(LAB_UI.index.title, lang),
    accent: t(LAB_UI.index.accent, lang),
    chips: LAB_ITEMS.map((item) => t(LAB_UI.kind[item.kind], lang)).filter((v, i, all) => all.indexOf(v) === i),
  });
}

export function labItemOg(id: LabId, lang: Lang) {
  const item = labById(id);
  return segmentOgImage({
    kicker: `${t(LAB_UI.og.index, lang)} · ${t(LAB_UI.kind[item.kind], lang)}`,
    title: t(item.title, lang),
    accent: t(item.accent, lang),
    chips: [...item.tags],
  });
}
