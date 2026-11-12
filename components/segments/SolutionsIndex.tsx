import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SEGMENT_HREFS_PT, SEGMENT_LIST, SEGMENT_UI, t, type Lang, type SegmentHrefs } from "@/content/segments";
import { siteUrl } from "@/lib/site-url";
import { indexJsonLd, JsonLd } from "./JsonLd";
import { publicFile } from "./media";

const line = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** /solucoes: a short intro and one large card per segment (poster of its demo), then a way out for other businesses. */
export function SolutionsIndex({ lang = "pt", hrefs = SEGMENT_HREFS_PT }: { lang?: Lang; hrefs?: SegmentHrefs }) {
  const ui = SEGMENT_UI.index;

  return (
    <>
      <JsonLd data={indexJsonLd(lang, hrefs, siteUrl())} />
      <header className="relative overflow-hidden px-[var(--pad)] pt-[calc(var(--nav-h)+clamp(40px,7vw,96px))] pb-[clamp(40px,5vw,72px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[20%] left-1/2 aspect-square w-[min(1100px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.12),rgb(62_242_196/0.05)_55%,transparent)]"
        />
        <div className="relative mx-auto max-w-[1360px]">
          <h1>
            <span className="label flex items-center gap-2.5">
              <span aria-hidden className="h-2 w-2 shrink-0 animate-blink rounded-full bg-acc shadow-[0_0_12px_var(--color-acc)]" />
              {t(ui.label, lang)}
            </span>
            <span className="mt-6 block max-w-[22ch] font-display text-[clamp(34px,5.4vw,80px)] leading-[1.02] font-extrabold tracking-[-0.045em]">
              <span className="line-mask" style={line(0)}>
                <span>{t(ui.title, lang)}</span>
              </span>
              <span className="line-mask" style={line(1)}>
                <span className="text-gradient">{t(ui.accent, lang)}</span>
              </span>
            </span>
          </h1>
          <Reveal as="p" delay={0.35} className="mt-7 max-w-[56ch] text-[clamp(16px,1.3vw,19px)] text-mute">
            {t(ui.sub, lang)}
          </Reveal>
        </div>
      </header>

      <section aria-label={t(ui.listLabel, lang)} className="px-[var(--pad)] pb-[clamp(64px,8vw,120px)]">
        <ul className="mx-auto grid max-w-[1360px] grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          {SEGMENT_LIST.map((segment, i) => {
            const poster = publicFile(segment.preview.poster) ?? publicFile(segment.still.src);
            return (
              <Reveal as="li" key={segment.id} delay={0.08 * (i % 2)}>
                <Link
                  href={hrefs.segment(segment.id)}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line-2 bg-bg-2/90 transition-[border-color,translate,box-shadow] duration-500 ease-soft hover:-translate-y-1.5 hover:border-acc hover:shadow-[0_40px_90px_-40px_rgb(185_255_75/0.55)] focus-visible:border-acc"
                >
                  <span className="relative block aspect-[16/9] overflow-hidden bg-bg-3">
                    {poster ? (
                      <Image
                        src={poster}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(70%_80%_at_70%_30%,rgb(185_255_75/0.2),transparent_60%),linear-gradient(160deg,#0b1310,#050807)] font-display text-[clamp(40px,6vw,80px)] font-extrabold tracking-[-0.05em]">
                        {segment.demo.brand}
                      </span>
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg-2 via-bg-2/10 via-35% to-transparent" />
                    <span className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-line-2 bg-bg/80 px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-mute uppercase backdrop-blur-md">
                      <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)]" />
                      {t(ui.demo, lang)} · {segment.demo.brand}
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-5 md:p-7">
                    <span className="font-mono text-[11px] tracking-[0.14em] text-acc uppercase">0{i + 1}</span>
                    <span className="mt-2 font-display text-[clamp(24px,2.6vw,38px)] leading-[1.05] font-bold tracking-[-0.035em]">{t(segment.name, lang)}</span>
                    <span className="mt-3 max-w-[46ch] text-[15.5px] leading-relaxed text-mute">{t(segment.card, lang)}</span>
                    <span className="mt-5 flex flex-wrap gap-1.5">
                      {segment.hero.chips.map((chip) => (
                        <span key={chip[lang]} className="chip">
                          {t(chip, lang)}
                        </span>
                      ))}
                    </span>
                    <span className="mt-auto flex items-center gap-2 pt-7 text-[14px] font-bold text-ink transition-colors group-hover:text-acc">
                      {t(ui.open, lang)}
                      <span aria-hidden className="transition-transform duration-300 ease-soft group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>

        <Reveal className="mx-auto mt-5 max-w-[1360px] lg:mt-6">
          <div className="card flex flex-wrap items-center justify-between gap-x-10 gap-y-5 bg-bg-2/60 px-6 py-7 md:px-9">
            <div>
              <h2 className="h-card">{t(ui.otherTitle, lang)}</h2>
              <p className="mt-2 max-w-[56ch] text-[15px] text-mute">{t(ui.otherText, lang)}</p>
            </div>
            <div className="flex flex-wrap gap-3 max-sm:w-full max-sm:flex-col">
              <Button href={hrefs.custom} className="max-sm:w-full">
                {t(ui.otherCta, lang)}
              </Button>
              <Button href={hrefs.contact} variant="ghost" className="max-sm:w-full">
                {t(ui.otherContact, lang)}
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
