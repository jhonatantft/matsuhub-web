import { localize } from "@/content/lab";
import { CLICK_COPY } from "@/content/lab/one-click";
import type { Lang } from "@/lib/i18n/core";
import { ClickStage } from "./ClickStage";

/** Server wrapper: resolves the copy to one language before it reaches the client. */
export function OneClick({ lang }: { lang: Lang }) {
  return <ClickStage lang={lang} copy={localize(CLICK_COPY, lang)} />;
}
