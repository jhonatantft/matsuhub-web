import type { Lang } from "./core";
import { en } from "./dictionaries/en";
import { pt, type Dictionary } from "./dictionaries/pt";

export * from "./core";
export * from "./sections";
export type { Dictionary };

const DICTIONARIES: Record<Lang, Dictionary> = { pt, en };

/** The interface copy of a language (server and client; both dictionaries are a few KB). */
export const dict = (lang: Lang): Dictionary => DICTIONARIES[lang];
