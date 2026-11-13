import Link from "next/link";
import { JsonLd } from "@/components/segments/JsonLd";
import { Label } from "@/components/ui/Label";
import { Reveal } from "@/components/ui/Reveal";
import { LAB_HREFS, LAB_ITEMS, LAB_UI, labById, readingMinutes, type LabId } from "@/content/lab";
import { LAB_BODIES } from "@/content/lab/bodies";
import { SITE } from "@/content/site";
import { fill, HTML_LANG, t, type Lang } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import { LabBody, LabCard, LabCta } from "./LabParts";

const line = (i: number) => ({ "--i": i }) as React.CSSProperties;

/**
 * One Lab page (/laboratorio/<slug> · /en/lab/<slug>): hero, the experiment (children, from the
 * route file, so each page only ships its own client code), the article, the rest of the Lab
 * and the CTA. Notes have no children; their body is the article.
 */
export function LabItemPage({ id, lang, children }: { id: LabId; lang: Lang; children?: React.ReactNode }) {
  const item = labById(id);
  const hrefs = LAB_HREFS[lang];
  const body = LAB_BODIES[id];
  const isNote = item.kind === "note";
  const base = siteUrl();
  const others = LAB_ITEMS.filter((other) => other.id !== id);
  const title = `${t(item.title, lang)} ${t(item.accent, lang)}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": isNote ? "TechArticle" : item.kind === "explainer" ? "LearningResource" : "WebPage",
              headline: title,
              name: title,
              description: t(item.summary, lang),
              inLanguage: HTML_LANG[lang],
              url: `${base}${hrefs.item(id)}`,
              keywords: item.tags.join(", "),
              publisher: { "@type": "Organization", name: SITE.name, url: base },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: t(LAB_UI.name, lang), item: `${base}${hrefs.index}` },
                { "@type": "ListItem", position: 2, name: title, item: `${base}${hrefs.item(id)}` },
              ],
            },
          ],
        }}
      />

      <header className="relative overflow-hidden px-[var(--pad)] pt-[calc(var(--nav-h)+clamp(28px,5vw,64px))] pb-[clamp(36px,5vw,64px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[30%] right-[-18%] aspect-square w-[min(900px,110vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.1),rgb(62_242_196/0.04)_55%,transparent)]"
        />
        <div className="relative mx-auto max-w-[1360px]">
          <nav aria-label="Breadcrumb" className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
            <ol className="flex flex-wrap items-center gap-2 text-dim">
              <li>
                <Link href={hrefs.index} className="text-mute transition-colors hover:text-acc">
                  {t(LAB_UI.name, lang)}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="max-w-[48ch] truncate text-acc">
                {title}
              </li>
            </ol>
          </nav>

          <h1 className="mt-8">
            <span className="label flex items-center gap-2.5">
              <span aria-hidden className="h-2 w-2 shrink-0 animate-blink rounded-full bg-acc shadow-[0_0_12px_var(--color-acc)]" />
              {t(LAB_UI.kind[item.kind], lang)}
              {isNote && <span className="text-dim">· {fill(t(LAB_UI.index.minutes, lang), { n: String(readingMinutes(body, lang)) })}</span>}
            </span>
            <span className="mt-6 block max-w-[20ch] font-display text-[clamp(34px,5vw,72px)] leading-[1.02] font-extrabold tracking-[-0.045em]">
              <span className="line-mask" style={line(0)}>
                <span>{t(item.title, lang)}</span>
              </span>
              <span className="line-mask" style={line(1)}>
                <span className="text-gradient">{t(item.accent, lang)}</span>
              </span>
            </span>
          </h1>
          <Reveal as="p" delay={0.3} className="mt-6 max-w-[62ch] text-[clamp(16px,1.3vw,19px)] text-mute">
            {t(item.summary, lang)}
          </Reveal>
          <Reveal delay={0.38} className="mt-6 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </Reveal>
        </div>
      </header>

      {children && <div className="relative px-[var(--pad)] pb-[clamp(56px,7vw,96px)]">{children}</div>}

      <article aria-labelledby={isNote ? undefined : "lab-how-title"} className="relative px-[var(--pad)] pb-[clamp(72px,9vw,128px)]">
        <div className="mx-auto max-w-[1360px] lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-16">
          <div className="mb-8 lg:mb-0">
            {!isNote && (
              <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
                <Label>{t(LAB_UI.item.how, lang)}</Label>
                <h2 id="lab-how-title" className="h-section mt-4 max-w-[14ch] text-[clamp(24px,2.6vw,38px)]">
                  {t(item.title, lang)} <span className="text-gradient">{t(item.accent, lang)}</span>
                </h2>
              </div>
            )}
          </div>
          <LabBody blocks={body} lang={lang} />
        </div>
      </article>

      <section aria-labelledby="lab-more-title" className="relative px-[var(--pad)] pb-[clamp(72px,9vw,128px)]">
        <div className="mx-auto max-w-[1360px]">
          <h2 id="lab-more-title" className="label">
            {t(LAB_UI.item.more, lang)}
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {others.map((other, i) => (
              <Reveal as="li" key={other.id} delay={0.06 * i}>
                <LabCard item={other} lang={lang} />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <LabCta lang={lang} />
    </>
  );
}
