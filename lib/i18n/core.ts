/**
 * The two languages of the MatsuHub site. Portuguese is the default and lives unprefixed (/, /solucoes…);
 * English lives under /en. Content is written as `{ pt, en }` pairs (`Localized<T>`) and read with `t()`.
 * No imports here: content/*, components and route files all build on this module.
 */

export type Lang = "pt" | "en";
export const LANGS: readonly Lang[] = ["pt", "en"];
export const DEFAULT_LANG: Lang = "pt";

export type Localized<T> = { pt: T; en: T };

/** Read one side of a pair. */
export const t = <T>(value: Localized<T>, lang: Lang): T => value[lang];

/** Replace `{name}` placeholders in a localized template. */
export const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);

/** `<html lang>` and hreflang codes. */
export const HTML_LANG: Record<Lang, string> = { pt: "pt-BR", en: "en" };
/** Open Graph locales. */
export const OG_LOCALE: Record<Lang, string> = { pt: "pt_BR", en: "en_US" };
/** Each language's name, in that language (for the switcher). */
export const LANG_NAMES: Record<Lang, string> = { pt: "Português", en: "English" };

export const otherLang = (lang: Lang): Lang => (lang === "pt" ? "en" : "pt");

/** The site language of a pathname: English under /en, Portuguese everywhere else. */
export const langOfPath = (pathname: string): Lang => (pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pt");

/** Number with the language's decimal separator ("1,2" / "1.2"). */
export const decimal = (n: number, digits: number, lang: Lang) => {
  const s = n.toFixed(digits);
  return lang === "pt" ? s.replace(".", ",") : s;
};
