import { localize } from "@/content/lab";
import { COMMON_PASSWORDS, COMMON_WORDS, PASSPHRASE_WORDS, PASSWORD_COPY } from "@/content/lab/password";
import type { Lang } from "@/lib/i18n/core";
import { PasswordStage } from "./PasswordStage";

/** Server wrapper: resolves the copy and the word lists to one language before they reach the client. */
export function PasswordLab({ lang }: { lang: Lang }) {
  return (
    <PasswordStage
      lang={lang}
      copy={localize(PASSWORD_COPY, lang)}
      words={PASSPHRASE_WORDS[lang]}
      dictionary={[...PASSPHRASE_WORDS.pt, ...PASSPHRASE_WORDS.en, ...COMMON_WORDS]}
      common={COMMON_PASSWORDS}
    />
  );
}
