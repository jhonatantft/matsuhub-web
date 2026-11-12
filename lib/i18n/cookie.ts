import { useSyncExternalStore } from "react";
import type { Lang } from "./core";

/**
 * The visitor's site language, remembered in a small `lang=en` cookie so pages outside the two
 * language trees (the Portuguese-only demos) can frame themselves in the visitor's language.
 * Set when an /en page is visited or EN is picked in the switcher; cleared on Portuguese pages
 * (no cookie = Portuguese). Client-only helpers: call them from effects and handlers.
 */
export const LANG_COOKIE = "lang";
const YEAR = 60 * 60 * 24 * 365;

export function rememberLang(lang: Lang) {
  document.cookie =
    lang === "en"
      ? `${LANG_COOKIE}=en; path=/; max-age=${YEAR}; samesite=lax`
      : `${LANG_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function readLangCookie(): Lang {
  return new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=en(?:;|$)`).test(document.cookie) ? "en" : "pt";
}

/** Re-read when the page comes back from the back/forward cache or regains focus. */
function subscribe(onChange: () => void) {
  window.addEventListener("pageshow", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("pageshow", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/** The remembered site language. Portuguese on the server and during hydration, then the cookie's. */
export const useSiteLang = (): Lang => useSyncExternalStore(subscribe, readLangCookie, () => "pt");
