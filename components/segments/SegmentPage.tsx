import { Label } from "@/components/ui/Label";
import { Reveal } from "@/components/ui/Reveal";
import { SEGMENT_HREFS_PT, SEGMENT_UI, t, type Lang, type Segment, type SegmentHrefs } from "@/content/segments";
import { siteUrl } from "@/lib/site-url";
import { JsonLd, segmentJsonLd } from "./JsonLd";
import { segmentMedia } from "./media";
import { SegmentAgent } from "./SegmentAgent";
import { SegmentCta } from "./SegmentCta";
import { SegmentFaq } from "./SegmentFaq";
import { SegmentFeatures } from "./SegmentFeatures";
import { SegmentHero } from "./SegmentHero";
import { SegmentIntegrations } from "./SegmentIntegrations";
import { SegmentPains } from "./SegmentPains";
import { SegmentProcess } from "./SegmentProcess";

type Props = { segment: Segment; lang?: Lang; hrefs?: SegmentHrefs };

/**
 * One segment landing page, top to bottom. `lang` and `hrefs` render the same page from the same
 * content in either language, with that language's routes.
 */
export function SegmentPage({ segment, lang = "pt", hrefs = SEGMENT_HREFS_PT }: Props) {
  const media = segmentMedia(segment);
  return (
    <>
      <JsonLd data={segmentJsonLd(segment, lang, hrefs, siteUrl())} />
      <SegmentHero segment={segment} lang={lang} hrefs={hrefs} media={media} />
      <SegmentPains segment={segment} lang={lang} />
      <SegmentFeatures segment={segment} lang={lang} hrefs={hrefs} still={media.still} />
      <SegmentAgent segment={segment} lang={lang} />
      <SegmentIntegrations segment={segment} lang={lang} />
      <SegmentProcess lang={lang} hrefs={hrefs} />
      <FaqSection segment={segment} lang={lang} />
      <SegmentCta segment={segment} lang={lang} hrefs={hrefs} />
    </>
  );
}

/** "06 — Perguntas frequentes": header on the left (sticky on desktop), accordion on the right. */
function FaqSection({ segment, lang }: { segment: Segment; lang: Lang }) {
  const ui = SEGMENT_UI.faq;
  return (
    <section aria-labelledby="faq-title" className="relative px-[var(--pad)] py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)] lg:self-start">
          <Reveal>
            <Label>{t(ui.label, lang)}</Label>
          </Reveal>
          <Reveal as="h2" id="faq-title" delay={0.06} className="h-section mt-[18px] max-w-[14ch] text-[clamp(26px,3.6vw,52px)]">
            {t(ui.title, lang)}
          </Reveal>
          <Reveal as="p" delay={0.1} className="mt-5 max-w-[40ch] text-mute">
            {t(ui.lead, lang)}
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <SegmentFaq items={segment.faq.map((item) => ({ q: t(item.q, lang), a: t(item.a, lang) }))} />
        </Reveal>
      </div>
    </section>
  );
}
