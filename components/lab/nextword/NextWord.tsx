import { localize } from "@/content/lab";
import { NEXT_COPY } from "@/content/lab/next-word";
import { SEARCH_CORPUS } from "@/content/lab/semantic-search";
import type { Lang } from "@/lib/i18n/core";
import { NextWordStage } from "./NextWordStage";

/** Server wrapper: the copy and the training text (the search experiment's help center), in one language. */
export function NextWord({ lang }: { lang: Lang }) {
  return <NextWordStage lang={lang} copy={localize(NEXT_COPY, lang)} corpus={SEARCH_CORPUS.map(([, text]) => text[lang])} />;
}
