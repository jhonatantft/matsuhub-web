"use client";

import { useEffect } from "react";
import type { Lang } from "@/lib/i18n/core";
import { rememberLang } from "@/lib/i18n/cookie";

/** Remembers the language of the site page being viewed (see lib/i18n/cookie). Renders nothing. */
export function LangSync({ lang }: { lang: Lang }) {
  useEffect(() => rememberLang(lang), [lang]);
  return null;
}
