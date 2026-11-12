import { Reveal } from "@/components/ui/Reveal";
import { SEGMENT_UI, t, type Lang, type Segment } from "@/content/segments";
import { SplitHeader } from "./SplitHeader";

/** "01 — O que trava hoje": the segment's everyday pains, in plain words. */
export function SegmentPains({ segment, lang }: { segment: Segment; lang: Lang }) {
  const { pains } = segment;
  return (
    <section aria-labelledby="trava-title" className="relative px-[var(--pad)] py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-[1360px]">
        <SplitHeader id="trava-title" label={t(SEGMENT_UI.pains.label, lang)} title={t(pains.title, lang)} lead={t(pains.lead, lang)} />

        <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {pains.items.map((item, i) => (
            <Reveal as="li" key={item.title[lang]} delay={0.06 * i} className="group relative flex flex-col bg-bg/95 px-5 pt-6 pb-7 sm:px-6">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px origin-left scale-x-[0.18] bg-[linear-gradient(90deg,var(--color-warm),transparent)] transition-transform duration-700 ease-soft group-hover:scale-x-100"
              />
              <span aria-hidden className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] text-warm/90 uppercase">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-warm/40 text-[12px] leading-none">!</span>
                0{i + 1}
              </span>
              <h3 className="mt-5 text-[17px] leading-snug font-bold text-ink">{t(item.title, lang)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-mute">{t(item.text, lang)}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
