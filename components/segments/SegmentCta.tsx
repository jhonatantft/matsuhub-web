import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Magnetic } from "@/components/ui/Magnetic";
import { Reveal } from "@/components/ui/Reveal";
import { SEGMENT_LIST, SEGMENT_UI, t, type Lang, type Segment, type SegmentHrefs } from "@/content/segments";
import { publicFile } from "./media";

/** Closing band: the segment's question, the two ways forward, then the other segment pages. */
export function SegmentCta({ segment, lang, hrefs }: { segment: Segment; lang: Lang; hrefs: SegmentHrefs }) {
  const ui = SEGMENT_UI;
  const others = SEGMENT_LIST.filter((s) => s.id !== segment.id);

  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden px-[var(--pad)] pt-[clamp(72px,9vw,140px)] pb-[clamp(64px,8vw,120px)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(980px,80%)] [mask-image:linear-gradient(transparent,#000_18%,#000_62%,transparent)]"
      >
        <div className="absolute top-[45%] left-1/2 aspect-square w-[min(1000px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(62_242_196/0.14),rgb(185_255_75/0.05)_55%,transparent)]" />
        <svg viewBox="0 0 800 800" className="absolute top-[45%] left-1/2 w-[min(900px,130vw)] -translate-x-1/2 -translate-y-1/2 opacity-60" fill="none">
          <circle cx="400" cy="400" r="250" stroke="rgb(190 255 215 / 0.10)" />
          <circle cx="400" cy="400" r="330" stroke="rgb(190 255 215 / 0.07)" strokeDasharray="2 7" />
          <g className="origin-center animate-spin-slow [animation-duration:40s] [transform-box:fill-box]">
            <circle cx="400" cy="400" r="330" stroke="url(#seg-cta-arc)" strokeWidth="1.5" strokeDasharray="180 1900" />
          </g>
          <defs>
            <linearGradient id="seg-cta-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b9ff4b" stopOpacity="0" />
              <stop offset="1" stopColor="#b9ff4b" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1360px]">
        <div className="text-center">
          <Reveal>
            <Label dot className="justify-center">
              {t(ui.cta.label, lang)}
            </Label>
          </Reveal>
          <Reveal
            as="h2"
            id="cta-title"
            delay={0.06}
            className="mx-auto mt-6 max-w-[18ch] font-display text-[clamp(30px,5.2vw,76px)] leading-[1.02] font-extrabold tracking-[-0.045em]"
          >
            {t(segment.cta.title, lang)}
          </Reveal>
          <Reveal as="p" delay={0.12} className="mx-auto mt-6 max-w-[48ch] text-[clamp(16px,1.3vw,19px)] text-mute">
            {t(segment.cta.sub, lang)}
          </Reveal>
          <Reveal delay={0.18} className="mt-9 flex flex-wrap justify-center gap-3 max-sm:flex-col">
            <Magnetic className="max-sm:w-full">
              <Button href={hrefs.contact} className="max-sm:w-full">
                {t(ui.ctaPrimary, lang)}
              </Button>
            </Magnetic>
            <Button href={hrefs.demo(segment.id)} variant="ghost" className="max-sm:w-full">
              {t(ui.ctaDemo, lang)}
            </Button>
          </Reveal>
        </div>

        <nav aria-labelledby="outras-title" className="mt-[clamp(64px,8vw,112px)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p id="outras-title" className="label">
              {t(ui.cta.others, lang)}
            </p>
            <Link href={hrefs.index} className="font-mono text-[11px] tracking-[0.12em] text-mute uppercase transition-colors hover:text-acc">
              {t(ui.cta.all, lang)} <span aria-hidden>→</span>
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {others.map((other, i) => {
              const poster = publicFile(other.preview.poster) ?? publicFile(other.still.src);
              return (
                <Reveal as="li" key={other.id} delay={0.06 * i}>
                  <Link
                    href={hrefs.segment(other.id)}
                    className="group flex h-full items-stretch gap-4 rounded-[18px] border border-line bg-bg-2/80 p-2.5 pr-5 transition-[border-color,translate,box-shadow] duration-500 ease-soft hover:-translate-y-0.5 hover:border-acc/60 hover:shadow-[0_24px_60px_-34px_rgb(185_255_75/0.55)] focus-visible:border-acc"
                  >
                    <span className="relative aspect-[4/3] w-[clamp(96px,30%,132px)] shrink-0 overflow-hidden rounded-[12px] bg-bg-3">
                      {poster ? (
                        <Image src={poster} alt="" fill sizes="132px" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.06]" />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(80%_80%_at_70%_30%,rgb(185_255_75/0.22),transparent_65%),linear-gradient(160deg,#0b1310,#050807)] font-display text-[18px] font-extrabold tracking-[-0.04em]">
                          {other.demo.brand}
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col justify-center py-1">
                      <span className="font-display text-[17px] leading-tight font-semibold tracking-[-0.02em]">{t(other.name, lang)}</span>
                      <span className="mt-1.5 text-[13.5px] leading-snug text-mute">{t(other.nav, lang)}</span>
                    </span>
                    <span aria-hidden className="self-center text-acc transition-transform duration-300 ease-soft group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}
