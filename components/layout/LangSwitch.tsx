"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { dict, HTML_LANG, LANG_NAMES, LANGS, mapHash, type Lang } from "@/lib/i18n";
import { rememberLang } from "@/lib/i18n/cookie";
import { switchPath } from "@/lib/i18n/routes";

/**
 * "PT · EN" in the header. The other language links to the same page in that language (its
 * homepage when the page has no twin), keeps the section hash when it maps (#servicos ↔ #services)
 * and remembers the choice in the `lang` cookie. A plain link: each language is its own root
 * layout, so switching is a full page load anyway. No automatic redirects, ever.
 */
export function LangSwitch({ lang, className }: { lang: Lang; className?: string }) {
  const pathname = usePathname();

  /** Remember the choice; carry the section hash over by rewriting the href just before the browser follows it. */
  const go = (to: Lang) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    rememberLang(to);
    const hash = mapHash(window.location.hash, lang, to);
    if (hash) event.currentTarget.href = `${switchPath(pathname, to)}${hash}`;
  };

  return (
    <div
      role="group"
      aria-label={dict(lang).lang.label}
      className={cn("flex h-10 items-center rounded-full border border-line-2 px-1 font-mono text-[11px] font-medium tracking-[0.1em]", className)}
    >
      {LANGS.map((l, i) => (
        <Fragment key={l}>
          {i > 0 && (
            <span aria-hidden className="text-dim">
              ·
            </span>
          )}
          {l === lang ? (
            <span aria-current="true" className="grid h-8 min-w-8 place-items-center rounded-full px-2 text-acc">
              <span aria-hidden>{l.toUpperCase()}</span>
              <span className="sr-only" lang={HTML_LANG[l]}>
                {LANG_NAMES[l]}
              </span>
            </span>
          ) : (
            <a
              href={switchPath(pathname, l)}
              hrefLang={HTML_LANG[l]}
              lang={HTML_LANG[l]}
              aria-label={LANG_NAMES[l]}
              onClick={go(l)}
              className="grid h-8 min-w-8 place-items-center rounded-full px-2 text-mute transition-colors hover:text-ink focus-visible:text-ink"
            >
              {l.toUpperCase()}
            </a>
          )}
        </Fragment>
      ))}
    </div>
  );
}
