import { ShowcaseScene } from "@/components/aurora/showcase/ShowcaseScene";
import { DemoCard } from "@/components/home/DemoPreview";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DEMOS, HOME } from "@/content/site";
import { sectionId, t, type Lang } from "@/lib/i18n";

/**
 * "02 — Demos por segmento": the header, a picker with one card per live demo (each playing a
 * looping recording of the real demo, see DemoCard) in a 2×2 grid — wide cards with the video at
 * the left from 1280 px, stacked cards below — and the pinned scroll scene that plays the Aurora
 * (real-estate) demo inside a browser window.
 */
export function DemoShowcase({ lang = "pt" }: { lang?: Lang }) {
  const copy = HOME.demos;
  const language = t(copy.language, lang);
  return (
    <section id={sectionId("demos", lang)} className="relative">
      <div className="px-[var(--pad)] pt-[clamp(80px,11vw,150px)] pb-[clamp(28px,4vw,56px)]">
        <SectionHeader label={t(copy.label, lang)} title={t(copy.title, lang)} sub={t(copy.sub, lang)} />
        {language && (
          <Reveal delay={0.16}>
            <p className="mt-5 flex max-w-[52ch] items-center gap-2 font-mono text-xs leading-snug tracking-[0.04em] text-mute">
              <span aria-hidden className="shrink-0 rounded-full border border-line-2 px-1.5 py-px text-[10px] text-acc">
                PT
              </span>
              {language}
            </p>
          </Reveal>
        )}

        <ul aria-label={t(copy.list, lang)} className="mt-10 grid gap-4 md:grid-cols-2 md:gap-4 lg:mt-12 lg:gap-5">
          {DEMOS.map((demo, i) => (
            <li key={demo.id}>
              <Reveal delay={0.1 + i * 0.08} className="h-full">
                <DemoCard
                  demo={{
                    href: demo.href,
                    preview: demo.preview,
                    segment: t(demo.segment, lang),
                    name: t(demo.name, lang),
                    blurb: t(demo.blurb, lang),
                    alt: t(demo.image.alt, lang),
                  }}
                  index={i}
                  lang={lang}
                />
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal delay={0.3} className="mt-6">
          <p className="flex items-center gap-2.5 font-mono text-xs font-medium tracking-[0.06em] text-mute">
            <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border border-acc/50 text-acc">
              ↓
            </span>
            <span>
              <span className="text-ink">{t(copy.hint, lang)}</span> {t(copy.hintRest, lang)}
            </span>
          </p>
        </Reveal>
      </div>

      {/* MatsuHub's commentary follows the page language; the Aurora site inside the window is Portuguese. */}
      <ShowcaseScene lang={lang} />
    </section>
  );
}
