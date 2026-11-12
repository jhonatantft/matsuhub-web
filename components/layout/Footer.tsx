import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CUSTOM } from "@/content/custom";
import { LAB_HREFS, LAB_ITEMS, LAB_UI } from "@/content/lab";
import { SEGMENT_HREFS, SEGMENT_LIST, SEGMENT_UI } from "@/content/segments";
import { DEMOS, NAV, SITE } from "@/content/site";
import { dict, sectionHref, t, type Lang } from "@/lib/i18n";

export function Footer({ lang = "pt" }: { lang?: Lang }) {
  const d = dict(lang).footer;
  const hrefs = SEGMENT_HREFS[lang];
  return (
    <footer className="relative z-10 overflow-hidden border-t border-line px-[var(--pad)] pt-16 pb-8">
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-5 max-w-[34ch] text-[15px] text-mute">{t(SITE.description, lang)}</p>
        </div>
        <nav aria-label={d.label}>
          <p className="label mb-4 text-mute">{d.navigate}</p>
          <ul className="grid gap-2 text-[15px]">
            {NAV.map((item) => (
              <li key={item.id}>
                <a href={sectionHref(item.id, lang)} className="text-mute transition-colors hover:text-acc">
                  {t(item.label, lang)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-solucoes">
          <p id="footer-solucoes" className="label mb-4 text-mute">
            {t(SEGMENT_UI.solutions, lang)}
          </p>
          <ul className="grid gap-2 text-[15px]">
            {SEGMENT_LIST.map((segment) => (
              <li key={segment.id}>
                <Link href={hrefs.segment(segment.id)} className="text-mute transition-colors hover:text-acc">
                  {t(segment.name, lang)}
                </Link>
              </li>
            ))}
            <li>
              <Link href={hrefs.custom} className="text-mute transition-colors hover:text-acc">
                {t(CUSTOM.name, lang)}
              </Link>
            </li>
            <li>
              <Link href={hrefs.index} className="text-mute/80 transition-colors hover:text-acc">
                {t(SEGMENT_UI.nav.all, lang)} →
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-lab">
          <p id="footer-lab" className="label mb-4 text-mute">
            {t(LAB_UI.name, lang)}
          </p>
          <ul className="grid gap-2 text-[15px]">
            {LAB_ITEMS.map((item) => (
              <li key={item.id}>
                <Link href={LAB_HREFS[lang].item(item.id)} className="text-mute transition-colors hover:text-acc">
                  {t(item.title, lang)} {t(item.accent, lang)}
                </Link>
              </li>
            ))}
            <li>
              <Link href={LAB_HREFS[lang].index} className="text-mute/80 transition-colors hover:text-acc">
                {t(LAB_UI.nav.all, lang)} →
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="label mb-4 text-mute">{d.demos}</p>
          <ul className="grid gap-2 text-[15px]">
            {DEMOS.map((demo) => (
              <li key={demo.id}>
                <Link href={demo.href} className="text-mute transition-colors hover:text-acc">
                  {t(demo.segment, lang)} — {demo.brand}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p
        aria-hidden
        className="text-outline mt-16 font-display text-[clamp(48px,17vw,280px)] leading-[0.82] font-extrabold tracking-[-0.06em] whitespace-nowrap opacity-25 select-none [-webkit-text-stroke-width:2px]"
      >
        matsuhub
      </p>

      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6 font-mono text-xs tracking-[0.1em] text-mute uppercase">
        <span>
          © {SITE.year} {SITE.name}
        </span>
        <span>{t(SITE.tagline, lang)}</span>
      </div>
    </footer>
  );
}
