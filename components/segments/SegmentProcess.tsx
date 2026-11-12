import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SEGMENT_UI, t, type Lang, type SegmentHrefs } from "@/content/segments";
import { SplitHeader } from "./SplitHeader";

/** "05 — Como funciona": the four phases of PROCESS as a compact timeline, linking to the full stage on the homepage. */
export function SegmentProcess({ lang, hrefs, label, title }: { lang: Lang; hrefs: SegmentHrefs; label?: string; title?: string }) {
  const ui = SEGMENT_UI.process;
  return (
    <section aria-labelledby="processo-title" className="relative px-[var(--pad)] py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-[1360px]">
        <SplitHeader
          id="processo-title"
          label={label ?? t(ui.label, lang)}
          title={
            <>
              {title ?? t(ui.title, lang)} <span className="text-gradient">{t(ui.accent, lang)}</span>
            </>
          }
          lead={t(ui.lead, lang)}
        />

        <ol className="relative mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          <span
            aria-hidden
            className="absolute top-[19px] right-[12%] left-[19px] hidden h-px bg-[linear-gradient(90deg,var(--color-acc),rgb(62_242_196/0.5)_60%,transparent)] opacity-60 lg:block"
          />
          {ui.phases.map((phase, i) => (
            <Reveal as="li" key={phase.title[lang]} delay={0.08 * i} className="relative">
              <span className="relative grid h-10 w-10 place-items-center rounded-full border border-acc/50 bg-bg font-mono text-[12px] text-acc shadow-[0_0_24px_-6px_rgb(185_255_75/0.6)]">
                0{i + 1}
              </span>
              <h3 className="mt-5 font-display text-[20px] leading-tight font-semibold tracking-[-0.02em]">{t(phase.title, lang)}</h3>
              <p className="mt-1.5 font-mono text-[11px] tracking-[0.1em] text-acc-2 uppercase">{t(phase.short, lang)}</p>
              <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-mute">{t(phase.text, lang)}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.2} className="mt-10">
          <Button href={hrefs.process} variant="ghost" size="sm">
            {t(ui.more, lang)}
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
