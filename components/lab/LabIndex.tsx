import Link from "next/link";
import { JsonLd } from "@/components/segments/JsonLd";
import { SplitHeader } from "@/components/segments/SplitHeader";
import { Reveal } from "@/components/ui/Reveal";
import { LAB_EXPERIMENTS, LAB_EXPLAINERS, LAB_HREFS, LAB_ITEMS, LAB_NOTES, LAB_UI } from "@/content/lab";
import { LAB_VIDEOS, QUARXEL, VIDEO_UI, videoPath, youtubeThumb } from "@/content/lab/videos";
import { SITE } from "@/content/site";
import { HTML_LANG, t, type Lang } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import { LabCard, LabCta } from "./LabParts";

const line = (i: number) => ({ "--i": i }) as React.CSSProperties;
const section = "relative px-[var(--pad)] py-[clamp(56px,7vw,104px)]";

/** /laboratorio · /en/lab — the experiments and the notes. Copy in content/lab. */
export function LabIndex({ lang }: { lang: Lang }) {
  const ui = LAB_UI.index;
  const hrefs = LAB_HREFS[lang];
  const base = siteUrl();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t(ui.metaTitle, lang),
          description: t(ui.metaDescription, lang),
          inLanguage: HTML_LANG[lang],
          url: `${base}${hrefs.index}`,
          publisher: { "@type": "Organization", name: SITE.name, url: base },
          hasPart: LAB_ITEMS.map((item) => ({
            "@type": item.kind === "note" ? "TechArticle" : item.kind === "explainer" ? "LearningResource" : "WebPage",
            name: `${t(item.title, lang)} ${t(item.accent, lang)}`,
            url: `${base}${hrefs.item(item.id)}`,
          })),
        }}
      />

      <header className="relative overflow-hidden px-[var(--pad)] pt-[calc(var(--nav-h)+clamp(40px,7vw,96px))] pb-[clamp(24px,4vw,48px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[45%] right-[-12%] aspect-square w-[min(1000px,120vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.12),rgb(62_242_196/0.05)_55%,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgb(185_255_75/0.045)_1px,transparent_1px),linear-gradient(90deg,rgb(185_255_75/0.045)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]"
        />
        <div className="relative mx-auto max-w-[1360px]">
          <h1>
            <span className="label flex items-center gap-2.5">
              <span aria-hidden className="h-2 w-2 shrink-0 animate-blink rounded-full bg-acc shadow-[0_0_12px_var(--color-acc)]" />
              {t(ui.label, lang)}
            </span>
            <span className="mt-6 block max-w-[18ch] font-display text-[clamp(36px,6vw,88px)] leading-[1] font-extrabold tracking-[-0.05em]">
              <span className="line-mask" style={line(0)}>
                <span>{t(ui.title, lang)}</span>
              </span>
              <span className="line-mask" style={line(1)}>
                <span className="text-gradient">{t(ui.accent, lang)}</span>
              </span>
            </span>
          </h1>
          <Reveal as="p" delay={0.3} className="mt-7 max-w-[60ch] text-[clamp(16px,1.3vw,19px)] text-mute">
            {t(ui.sub, lang)}
          </Reveal>
        </div>
      </header>

      <section aria-labelledby="lab-learn-title" className={section}>
        <div className="mx-auto max-w-[1360px]">
          <SplitHeader id="lab-learn-title" label={t(ui.explainersLabel, lang)} title={t(ui.explainersTitle, lang)} lead={t(ui.explainersLead, lang)} />
          <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {LAB_EXPLAINERS.map((item, i) => (
              <Reveal as="li" key={item.id} delay={0.08 * i}>
                <LabCard item={item} lang={lang} />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="lab-exp-title" className={section}>
        <div className="mx-auto max-w-[1360px]">
          <SplitHeader id="lab-exp-title" label={t(ui.experimentsLabel, lang)} title={t(ui.experimentsTitle, lang)} lead={t(ui.experimentsLead, lang)} />
          <ul className="mt-10 grid grid-cols-1 gap-5 lg:mt-14 lg:grid-cols-2">
            {LAB_EXPERIMENTS.map((item, i) => (
              <Reveal as="li" key={item.id} delay={0.08 * i}>
                <LabCard item={item} lang={lang} big />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="lab-notes-title" className={section}>
        <div className="mx-auto max-w-[1360px]">
          <SplitHeader id="lab-notes-title" label={t(ui.notesLabel, lang)} title={t(ui.notesTitle, lang)} lead={t(ui.notesLead, lang)} />
          <ul className="mt-10 grid grid-cols-1 gap-5 lg:mt-14 lg:grid-cols-2">
            {LAB_NOTES.map((item, i) => (
              <Reveal as="li" key={item.id} delay={0.08 * i}>
                <LabCard item={item} lang={lang} big />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {LAB_VIDEOS.length > 0 && (
        <section id="videos" aria-labelledby="lab-videos-title" className={`${section} scroll-mt-[var(--nav-h)]`}>
          <div className="mx-auto max-w-[1360px]">
            <SplitHeader id="lab-videos-title" label={t(VIDEO_UI.sectionLabel, lang)} title={t(VIDEO_UI.sectionTitle, lang)} lead={t(VIDEO_UI.sectionLead, lang)} />
            <ul className="mt-10 grid grid-cols-1 gap-5 lg:mt-14 lg:grid-cols-2">
              {LAB_VIDEOS.map((video, i) => (
                <Reveal as="li" key={video.id} delay={0.08 * i}>
                  <Link href={videoPath(video.id, lang)} className="card group block h-full overflow-hidden rounded-[20px] transition-colors hover:border-acc/40">
                    <span className="relative block aspect-video overflow-hidden bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail */}
                      <img src={youtubeThumb(video.youtubeId)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-85 transition-[opacity,transform] duration-500 group-hover:scale-[1.03] group-hover:opacity-100" />
                      <span className="absolute right-3 bottom-3 rounded-md bg-bg/85 px-2 py-1 font-mono text-[11px] text-ink">{video.duration}</span>
                    </span>
                    <span className="block p-6">
                      <span className="label">
                        {QUARXEL.name} · {video.series}
                      </span>
                      <span className="mt-3 block font-display text-[clamp(20px,2vw,26px)] leading-[1.15] font-bold tracking-[-0.025em]">
                        {t(video.title, lang)} <span className="text-gradient">{t(video.accent, lang)}</span>
                      </span>
                      <span className="mt-3 block text-[15px] leading-relaxed text-mute">{t(video.summary, lang)}</span>
                      <span className="mt-5 inline-flex items-center gap-2 font-medium text-acc">
                        {t(VIDEO_UI.open, lang)} <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      <LabCta lang={lang} />
    </>
  );
}
