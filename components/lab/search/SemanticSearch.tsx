import { localize } from "@/content/lab";
import { SEARCH_COPY, SEARCH_CORPUS, SEARCH_TOPICS } from "@/content/lab/semantic-search";
import type { Lang } from "@/lib/i18n/core";
import { SearchStage } from "./SearchStage";

/** Server wrapper: resolves the corpus and copy to one language before they reach the client. */
export function SemanticSearch({ lang }: { lang: Lang }) {
  return (
    <SearchStage
      lang={lang}
      copy={localize(SEARCH_COPY, lang)}
      topics={SEARCH_TOPICS.map((topic) => topic.label[lang])}
      corpus={SEARCH_CORPUS.map(([topic, text]) => ({ topic, text: text[lang] }))}
    />
  );
}
