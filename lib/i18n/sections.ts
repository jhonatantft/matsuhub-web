import type { Lang, Localized } from "./core";

/**
 * The homepage sections and their anchors per language. The section components take their `id`
 * from here and every link to a section is built with `sectionHref`, so ids and links never drift.
 */
export type SectionKey = "services" | "demos" | "agents" | "process" | "contact";

export const SECTION_IDS: Record<SectionKey, Localized<string>> = {
  services: { pt: "servicos", en: "services" },
  demos: { pt: "demos", en: "demos" },
  agents: { pt: "agentes", en: "agents" },
  process: { pt: "processo", en: "process" },
  contact: { pt: "contato", en: "contact" },
};

/** The homepage of each language. */
export const HOME_PATH: Localized<string> = { pt: "/", en: "/en" };

export const sectionId = (key: SectionKey, lang: Lang) => SECTION_IDS[key][lang];

/** "/#contato" · "/en#contact" */
export const sectionHref = (key: SectionKey, lang: Lang) => `${HOME_PATH[lang]}#${sectionId(key, lang)}`;

/** The same section's hash in the other language ("#servicos" → "#services"), or "" when it has none. */
export function mapHash(hash: string, from: Lang, to: Lang): string {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return "";
  const key = (Object.keys(SECTION_IDS) as SectionKey[]).find((k) => SECTION_IDS[k][from] === id);
  return key ? `#${SECTION_IDS[key][to]}` : "";
}
