import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { Reveal } from "@/components/ui/Reveal";
import { fill, SEGMENT_UI, t, type Lang, type Segment, type SegmentHrefs } from "@/content/segments";
import type { SegmentMedia } from "./media";
import { SegmentPreview } from "./SegmentPreview";

const line = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** Breadcrumb, the outcome headline (with the segment named in the h1), CTAs and the demo's looping preview. */
export function SegmentHero({ segment, lang, hrefs, media }: { segment: Segment; lang: Lang; hrefs: SegmentHrefs; media: SegmentMedia }) {
  const ui = SEGMENT_UI;
  const demo = { demo: segment.demo.brand };

  return (
    <header className="relative overflow-hidden px-[var(--pad)] pt-[calc(var(--nav-h)+clamp(28px,5vw,64px))] pb-[clamp(56px,7vw,104px)]">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[38%] right-[-12%] aspect-square w-[min(980px,120vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.13),rgb(62_242_196/0.05)_55%,transparent)]"
      />

      <div className="relative mx-auto max-w-[1360px]">
        <nav aria-label={t(ui.breadcrumb, lang)} className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
          <ol className="flex flex-wrap items-center gap-2 text-dim">
            <li>
              <Link href={hrefs.index} className="text-mute transition-colors hover:text-acc">
                {t(ui.solutions, lang)}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-acc">
              {t(segment.name, lang)}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid grid-cols-1 items-center gap-x-[clamp(32px,5vw,80px)] gap-y-12 lg:mt-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
          <div>
            <h1>
              <span className="label flex items-center gap-2.5">
                <span aria-hidden className="h-2 w-2 shrink-0 animate-blink rounded-full bg-acc shadow-[0_0_12px_var(--color-acc)]" />
                {t(segment.audience, lang)}
              </span>
              <span className="mt-6 block font-display text-[clamp(32px,4.2vw,60px)] leading-[1.03] font-extrabold tracking-[-0.045em]">
                <span className="line-mask" style={line(0)}>
                  <span>{t(segment.hero.title, lang)}</span>
                </span>
                <span className="line-mask" style={line(1)}>
                  <span className="text-gradient">{t(segment.hero.accent, lang)}</span>
                </span>
              </span>
            </h1>

            <Reveal as="p" delay={0.35} className="mt-6 max-w-[50ch] text-[clamp(16px,1.3vw,19px)] text-mute">
              {t(segment.hero.sub, lang)}
            </Reveal>

            <Reveal delay={0.45} className="mt-8 flex flex-wrap gap-3 max-sm:flex-col">
              <Magnetic className="max-sm:w-full">
                <Button href={hrefs.contact} className="max-sm:w-full">
                  {t(ui.ctaPrimary, lang)}
                </Button>
              </Magnetic>
              <Button href={hrefs.demo(segment.id)} variant="ghost" className="max-sm:w-full">
                {t(ui.ctaDemo, lang)}
              </Button>
            </Reveal>

            <Reveal delay={0.55} className="mt-8">
              <ul className="flex flex-wrap gap-2" aria-label={t(ui.chipsLabel, lang)}>
                {segment.hero.chips.map((chip) => (
                  <li key={chip[lang]} className="chip border-line-2 text-ink/80">
                    <span aria-hidden className="h-1 w-1 rounded-full bg-acc-2" />
                    {t(chip, lang)}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.25}>
            <SegmentPreview
              href={hrefs.demo(segment.id)}
              domain={segment.demo.domain}
              brand={segment.demo.brand}
              video={media.video}
              poster={media.poster}
              labels={{
                live: t(media.video ? ui.preview.live : ui.preview.liveStill, lang),
                play: t(ui.preview.play, lang),
                pause: t(ui.preview.pause, lang),
                playLabel: fill(t(ui.preview.playLabel, lang), demo),
                pauseLabel: fill(t(ui.preview.pauseLabel, lang), demo),
                link: fill(t(ui.preview.linkLabel, lang), demo),
                fallback: t(ui.preview.fallback, lang),
              }}
            />
            <p className="mt-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-mute">
              <span aria-hidden className="text-acc">↗</span>
              {fill(t(media.video ? ui.preview.caption : ui.preview.captionStill, lang), demo)}
            </p>
          </Reveal>
        </div>
      </div>
    </header>
  );
}
