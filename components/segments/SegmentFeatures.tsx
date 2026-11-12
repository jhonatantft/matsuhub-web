import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SEGMENT_UI, t, type Lang, type Segment, type SegmentFeature, type SegmentHrefs } from "@/content/segments";
import { cn } from "@/lib/cn";
import { SplitHeader } from "./SplitHeader";

/**
 * "02 — O que construímos": six features, each a deep link to where it can be tried in the demo.
 * The first one is the highlight, shown big with a still from the demo (or a branded panel).
 */
export function SegmentFeatures({ segment, lang, hrefs, still }: { segment: Segment; lang: Lang; hrefs: SegmentHrefs; still: string | null }) {
  const { features } = segment;
  const [first, ...rest] = features.items;
  const ui = SEGMENT_UI.features;

  return (
    <section aria-labelledby="recursos-title" className="relative px-[var(--pad)] py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-[1360px]">
        <SplitHeader id="recursos-title" label={t(ui.label, lang)} title={t(features.title, lang)} lead={t(features.lead, lang)} />

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          <Reveal className="md:col-span-2 lg:row-span-2">
            <article className="card group flex h-full flex-col bg-bg-2/70 p-5 transition-colors duration-500 hover:border-acc/40 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="chip border-acc/40 text-acc">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)]" />
                  {t(ui.highlight, lang)}
                </span>
                <Num n={1} />
              </div>
              <h3 className="h-card mt-5 text-[clamp(22px,2.3vw,32px)]">{t(first.title, lang)}</h3>
              <p className="mt-3 max-w-[56ch] text-[15.5px] leading-relaxed text-mute">{t(first.text, lang)}</p>
              <TryLink feature={first} href={hrefs.demo(segment.id, first.anchor)} lang={lang} />

              <div className="relative mt-6 aspect-[16/9] flex-1 overflow-hidden rounded-[14px] border border-line bg-bg-3 lg:aspect-auto lg:min-h-[340px]">
                {still && segment.still.contain ? (
                  <>
                    {/* A square photo shown whole: its edges fade into a matching backdrop. */}
                    <span className="absolute inset-0" style={{ background: segment.still.contain }} />
                    <span className="absolute inset-y-0 left-1/2 aspect-square h-full -translate-x-1/2 [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]">
                      <Image
                        src={still}
                        alt={t(segment.still.alt, lang)}
                        fill
                        sizes="(min-width: 1024px) 420px, 60vw"
                        className="object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
                      />
                    </span>
                  </>
                ) : still ? (
                  <Image
                    src={still}
                    alt={t(segment.still.alt, lang)}
                    fill
                    sizes="(min-width: 1024px) 860px, (min-width: 768px) 92vw, 100vw"
                    className="object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(70%_80%_at_70%_30%,rgb(185_255_75/0.18),transparent_60%),linear-gradient(160deg,#0b1310,#050807)] font-display text-[clamp(40px,6vw,80px)] font-extrabold tracking-[-0.05em]">
                    {segment.demo.brand}
                  </span>
                )}
                <Corners />
                <span className="absolute right-3 bottom-3 rounded-full border border-line-2 bg-bg/80 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-mute uppercase backdrop-blur-md">
                  {segment.demo.domain}
                </span>
              </div>
            </article>
          </Reveal>

          {rest.map((feature, i) => (
            <Reveal key={feature.title[lang]} delay={0.06 * ((i % 3) + 1)} className={cn(i === rest.length - 1 && rest.length % 2 === 1 && "md:col-span-2 lg:col-span-1")}>
              <article className="card group flex h-full flex-col bg-bg-2/70 p-5 transition-colors duration-500 hover:border-acc/40 md:p-6">
                <Num n={i + 2} />
                <h3 className="h-card mt-4">{t(feature.title, lang)}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-mute">{t(feature.text, lang)}</p>
                <TryLink feature={feature} href={hrefs.demo(segment.id, feature.anchor)} lang={lang} />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Num({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="font-display text-[34px] leading-none font-bold tracking-[-0.05em] text-transparent transition-[-webkit-text-stroke-color] duration-500 [-webkit-text-stroke:1px_rgb(190_255_215/0.28)] group-hover:[-webkit-text-stroke-color:rgb(185_255_75/0.8)]"
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

/** "veja no demo →" plus what to do there; the whole thing is one link with a descriptive name. */
function TryLink({ feature, href, lang }: { feature: SegmentFeature; href: string; lang: Lang }) {
  return (
    <Link href={href} className="group/try mt-auto flex items-start gap-3 pt-5">
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.14em] text-acc uppercase">
          {t(SEGMENT_UI.features.tryIn, lang)}
          <span aria-hidden className="transition-transform duration-300 ease-soft group-hover/try:translate-x-1">
            →
          </span>
        </span>
        <span className="text-[13.5px] leading-snug text-ink/75 underline decoration-line-2 underline-offset-4 transition-colors group-hover/try:text-ink group-hover/try:decoration-acc/60">
          {t(feature.try, lang)}
        </span>
      </span>
    </Link>
  );
}

/** HUD corner brackets over the still. */
function Corners() {
  const c = "absolute h-4 w-4 border-acc/70";
  return (
    <span aria-hidden className="pointer-events-none absolute inset-3">
      <i className={cn(c, "top-0 left-0 border-t border-l")} />
      <i className={cn(c, "top-0 right-0 border-t border-r")} />
      <i className={cn(c, "bottom-0 left-0 border-b border-l")} />
      <i className={cn(c, "right-0 bottom-0 border-r border-b")} />
    </span>
  );
}
