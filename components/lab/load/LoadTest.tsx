import { localize } from "@/content/lab";
import { LOAD_COPY } from "@/content/lab/load-test";
import type { Lang } from "@/lib/i18n/core";
import { LoadTestStage } from "./LoadTestStage";

/** Server wrapper: resolves the copy to one language before it reaches the client. */
export function LoadTest({ lang }: { lang: Lang }) {
  return <LoadTestStage lang={lang} copy={localize(LOAD_COPY, lang)} />;
}
