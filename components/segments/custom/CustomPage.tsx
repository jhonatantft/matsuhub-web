import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Magnetic } from "@/components/ui/Magnetic";
import { Reveal } from "@/components/ui/Reveal";
import { CUSTOM } from "@/content/custom";
import { SEGMENT_HREFS_PT, SEGMENT_UI, t, type Lang, type SegmentHrefs } from "@/content/segments";
import { siteUrl } from "@/lib/site-url";
import { customJsonLd, JsonLd } from "../JsonLd";
import { SegmentFaq } from "../SegmentFaq";
import { SegmentProcess } from "../SegmentProcess";
import { SplitHeader } from "../SplitHeader";
import { ArchitectureMap, type MapNodeId } from "./ArchitectureMap";

const line = (i: number) => ({ "--i": i }) as React.CSSProperties;
const section = "relative px-[var(--pad)] py-[clamp(64px,8vw,120px)]";

/**
 * /solucoes/sob-medida · /en/solutions/custom — the solution that isn't an industry: custom
 * software of any kind. Hero with the live architecture diagram, what we build, the engineering
 * bar, example problems, process, FAQ and CTA. Copy in content/custom.ts.
 */
export function CustomPage({ lang = "pt", hrefs = SEGMENT_HREFS_PT }: { lang?: Lang; hrefs?: SegmentHrefs }) {
  const c = CUSTOM;
  return (
    <>
      <JsonLd data={customJsonLd(lang, hrefs, siteUrl())} />

      {/* Hero */}
      <header className="relative overflow-hidden px-[var(--pad)] pt-[calc(var(--nav-h)+clamp(28px,5vw,64px))] pb-[clamp(56px,7vw,104px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[42%] right-[-14%] aspect-square w-[min(1040px,125vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.12),rgb(62_242_196/0.05)_55%,transparent)]"
        />
        <div className="relative mx-auto max-w-[1360px]">
          <nav aria-label={t(SEGMENT_UI.breadcrumb, lang)} className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
            <ol className="flex flex-wrap items-center gap-2 text-dim">
              <li>
                <Link href={hrefs.index} className="text-mute transition-colors hover:text-acc">
                  {t(SEGMENT_UI.solutions, lang)}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-acc">
                {t(c.name, lang)}
              </li>
            </ol>
          </nav>

          <div className="mt-8 grid grid-cols-1 items-center gap-x-[clamp(32px,4vw,72px)] gap-y-12 lg:mt-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div>
              <h1>
                <span className="label flex items-center gap-2.5">
                  <span aria-hidden className="h-2 w-2 shrink-0 animate-blink rounded-full bg-acc shadow-[0_0_12px_var(--color-acc)]" />
                  {t(c.hero.label, lang)}
                </span>
                <span className="mt-6 block font-display text-[clamp(34px,4.6vw,66px)] leading-[1.03] font-extrabold tracking-[-0.045em]">
                  <span className="line-mask" style={line(0)}>
                    <span>{t(c.hero.title, lang)}</span>
                  </span>
                  <span className="line-mask" style={line(1)}>
                    <span className="text-gradient">{t(c.hero.accent, lang)}</span>
                  </span>
                </span>
              </h1>

              <Reveal as="p" delay={0.35} className="mt-6 max-w-[50ch] text-[clamp(16px,1.3vw,19px)] text-mute">
                {t(c.hero.sub, lang)}
              </Reveal>

              <Reveal delay={0.45} className="mt-8 flex flex-wrap gap-3 max-sm:flex-col">
                <Magnetic className="max-sm:w-full">
                  <Button href={hrefs.contact} className="max-sm:w-full">
                    {t(c.hero.cta, lang)}
                  </Button>
                </Magnetic>
                <Button href="#processo-title" variant="ghost" className="max-sm:w-full">
                  {t(c.hero.ctaProcess, lang)}
                </Button>
              </Reveal>

              <Reveal delay={0.55} className="mt-8">
                <ul className="flex flex-wrap gap-2">
                  {c.hero.chips.map((chip) => (
                    <li key={chip.pt} className="chip border-line-2 text-ink/80">
                      <span aria-hidden className="h-1 w-1 rounded-full bg-acc-2" />
                      {t(chip, lang)}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal delay={0.25}>
              <ArchitectureMap
                nodes={c.map.nodes.map((node) => ({
                  id: node.id as MapNodeId,
                  label: t(node.label, lang),
                  name: t(node.name, lang),
                  desc: t(node.desc, lang),
                }))}
                labels={{
                  title: t(c.map.title, lang),
                  caption: t(c.map.caption, lang),
                  hint: t(c.map.hint, lang),
                  legend: { request: t(c.map.legend.request, lang), event: t(c.map.legend.event, lang), ai: t(c.map.legend.ai, lang) },
                  groups: {
                    channel: t(c.map.groups.channel, lang),
                    entry: t(c.map.groups.entry, lang),
                    service: t(c.map.groups.service, lang),
                    ai: t(c.map.groups.ai, lang),
                    data: t(c.map.groups.data, lang),
                    integration: t(c.map.groups.integration, lang),
                  },
                }}
              />
            </Reveal>
          </div>
        </div>
      </header>

      {/* 01 — What we build */}
      <section aria-labelledby="custom-build-title" className={section}>
        <div className="mx-auto max-w-[1360px]">
          <SplitHeader
            id="custom-build-title"
            label={t(c.capabilities.label, lang)}
            title={
              <>
                {t(c.capabilities.title, lang)} <span className="text-gradient">{t(c.capabilities.accent, lang)}</span>
              </>
            }
            lead={t(c.capabilities.lead, lang)}
          />
          <ul className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[22px] border border-line bg-line sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {c.capabilities.items.map((item, i) => (
              <Reveal as="li" key={item.title.pt} delay={0.05 * (i % 3)} className="group relative bg-bg p-6 transition-colors duration-500 hover:bg-bg-2 md:p-8">
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,var(--color-acc),var(--color-acc-2))] transition-transform duration-700 ease-soft group-hover:scale-x-100"
                />
                <span className="font-mono text-[11px] tracking-[0.14em] text-acc">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 font-display text-[clamp(20px,1.7vw,24px)] leading-tight font-semibold tracking-[-0.02em]">{t(item.title, lang)}</h3>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-mute">{t(item.text, lang)}</p>
                <p className="mt-5 font-mono text-[10.5px] tracking-[0.1em] text-acc-2/80 uppercase">{t(item.tags, lang)}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 02 — Engineering */}
      <section aria-labelledby="custom-eng-title" className={section}>
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-start gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <Reveal>
              <Label>{t(c.engineering.label, lang)}</Label>
            </Reveal>
            <Reveal as="h2" id="custom-eng-title" delay={0.06} className="h-section mt-[18px] max-w-[16ch] text-[clamp(26px,3.6vw,52px)]">
              {t(c.engineering.title, lang)} <span className="text-gradient">{t(c.engineering.accent, lang)}</span>
            </Reveal>
            <Reveal as="p" delay={0.1} className="mt-5 max-w-[52ch] text-[clamp(16px,1.25vw,18px)] text-mute">
              {t(c.engineering.lead, lang)}
            </Reveal>
            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {c.engineering.items.map((item, i) => (
                <Reveal as="li" key={item.title.pt} delay={0.05 * i} className="flex gap-3.5">
                  <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-acc/50 text-[11px] text-acc">
                    ✓
                  </span>
                  <span>
                    <span className="block font-display text-[16.5px] font-semibold tracking-[-0.01em]">{t(item.title, lang)}</span>
                    <span className="mt-1 block text-[14.5px] leading-snug text-mute">{t(item.text, lang)}</span>
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal delay={0.15} className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
            <div className="overflow-hidden rounded-[20px] border border-line-2 bg-[rgb(7_13_10/0.85)] font-mono shadow-[0_40px_100px_-50px_rgb(185_255_75/0.4)]">
              <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-line-2" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-line-2" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-line-2" />
                <span className="ml-3 text-[11px] tracking-[0.12em] text-mute uppercase">{t(c.engineering.pipeline.title, lang)}</span>
              </div>
              <ol className="relative px-5 py-5">
                <span aria-hidden className="absolute top-8 bottom-16 left-[30px] w-px bg-[linear-gradient(var(--color-acc),var(--color-acc-2))] opacity-40" />
                {c.engineering.pipeline.steps.map((step, i) => (
                  <Reveal as="li" key={step.pt} delay={0.25 + 0.14 * i} className="relative flex items-center gap-4 py-2.5 text-[13.5px]">
                    <span aria-hidden className="relative grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-acc/60 bg-bg text-[11px] text-acc">
                      ✓
                    </span>
                    <span className="flex-1 text-ink/85">{t(step, lang)}</span>
                    <span aria-hidden className="text-[11px] text-acc-2/80">ok</span>
                  </Reveal>
                ))}
                <Reveal as="li" delay={0.25 + 0.14 * c.engineering.pipeline.steps.length} className="relative mt-2 flex items-center gap-4 border-t border-line pt-4 text-[13.5px]">
                  <span aria-hidden className="relative grid h-[22px] w-[22px] shrink-0 place-items-center">
                    <span className="absolute h-[22px] w-[22px] animate-ping rounded-full bg-acc/30 motion-reduce:hidden" />
                    <span className="h-2.5 w-2.5 rounded-full bg-acc shadow-[0_0_14px_var(--color-acc)]" />
                  </span>
                  <span className="font-semibold tracking-[0.1em] text-acc uppercase">{t(c.engineering.pipeline.done, lang)}</span>
                </Reveal>
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 03 — Example problems */}
      <section aria-labelledby="custom-ex-title" className={section}>
        <div className="mx-auto max-w-[1360px]">
          <SplitHeader id="custom-ex-title" label={t(c.examples.label, lang)} title={t(c.examples.title, lang)} lead={t(c.examples.lead, lang)} />
          <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-14 xl:grid-cols-4">
            {c.examples.items.map((item, i) => (
              <Reveal as="li" key={item.sector.pt} delay={0.06 * i} className="card flex flex-col p-6 md:p-7">
                <span className="chip self-start border-line-2 text-acc-2">{t(item.sector, lang)}</span>
                <p className="mt-6 font-mono text-[10.5px] tracking-[0.14em] text-dim uppercase">{t(c.examples.problem, lang)}</p>
                <p className="mt-2 font-display text-[19px] leading-snug font-semibold tracking-[-0.015em]">{t(item.problem, lang)}</p>
                <div aria-hidden className="my-6 flex items-center gap-2 text-acc">
                  <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--color-acc),transparent)] opacity-60" />↓
                </div>
                <p className="font-mono text-[10.5px] tracking-[0.14em] text-dim uppercase">{t(c.examples.build, lang)}</p>
                <ul className="mt-3 grid gap-2">
                  {item.parts.map((part) => (
                    <li key={part.pt} className="flex gap-2.5 text-[14.5px] leading-snug text-ink/85">
                      <span aria-hidden className="text-acc">+</span>
                      {t(part, lang)}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 04 — Process */}
      <SegmentProcess lang={lang} hrefs={hrefs} label={t(c.process.label, lang)} title={t(c.process.title, lang)} />

      {/* 05 — FAQ */}
      <section aria-labelledby="faq-title" className={section}>
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)] lg:self-start">
            <Reveal>
              <Label>{t(c.faq.label, lang)}</Label>
            </Reveal>
            <Reveal as="h2" id="faq-title" delay={0.06} className="h-section mt-[18px] max-w-[14ch] text-[clamp(26px,3.6vw,52px)]">
              {t(SEGMENT_UI.faq.title, lang)}
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <SegmentFaq items={c.faq.items.map((item) => ({ q: t(item.q, lang), a: t(item.a, lang) }))} />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section aria-labelledby="custom-cta-title" className="relative px-[var(--pad)] pt-[clamp(32px,4vw,64px)] pb-[clamp(80px,10vw,140px)]">
        <Reveal className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[28px] border border-line-2 bg-bg-2/70 px-6 py-12 md:px-14 md:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgb(185_255_75/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(185_255_75/0.05)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_80%_20%,black,transparent_70%)]"
          />
          <div className="relative grid grid-cols-1 items-end gap-10 lg:grid-cols-[minmax(0,1.2fr)_auto]">
            <div>
              <Label>{t(c.cta.label, lang)}</Label>
              <h2 id="custom-cta-title" className="h-section mt-[18px] max-w-[18ch] text-[clamp(28px,4vw,58px)]">
                {t(c.cta.title, lang)} <span className="text-gradient">{t(c.cta.accent, lang)}</span>
              </h2>
              <p className="mt-5 max-w-[52ch] text-[clamp(16px,1.25vw,18px)] text-mute">{t(c.cta.text, lang)}</p>
            </div>
            <div className="flex flex-wrap gap-3 max-sm:flex-col lg:flex-col lg:items-stretch">
              <Magnetic className="max-sm:w-full">
                <Button href={hrefs.contact} className="w-full">
                  {t(c.cta.button, lang)}
                </Button>
              </Magnetic>
              <Button href={hrefs.index} variant="ghost" className="max-sm:w-full">
                {t(c.cta.segments, lang)}
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
