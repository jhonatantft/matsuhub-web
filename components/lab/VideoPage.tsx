import Link from "next/link";
import { JsonLd } from "@/components/segments/JsonLd";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { LAB_HREFS, LAB_UI, labById } from "@/content/lab";
import { QUARXEL, VIDEO_UI, videoById, videoPath, youtubeThumb, youtubeWatch, type VideoId } from "@/content/lab/videos";
import { SITE } from "@/content/site";
import { t, type Lang } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import { LabCta } from "./LabParts";
import { VideoPlayer } from "./VideoPlayer";

/** The long data of a video: generated from the channel's script and upload sheet (see content/lab/videos.ts). */
export type VideoData = {
  description: string[];
  chapters: { t: string; s: number; title: string }[];
  sources: { topic: string | null; items: { label: string; url: string }[] }[];
  sourcesNote: string | null;
  factCheckTitle: string;
  research: {
    title: string;
    blocks: ({ type: "p"; text: string } | { type: "list"; items: string[] } | { type: "table"; head: string[]; rows: string[][] })[];
  }[];
  narration: { id: string; name: string; clock: string | null; paragraphs: string[] }[];
};

const line = (i: number) => ({ "--i": i }) as React.CSSProperties;
const block = "relative px-[var(--pad)] pb-[clamp(56px,7vw,96px)]";
const h2 = "font-display text-[clamp(24px,2.6vw,38px)] leading-[1.08] font-bold tracking-[-0.035em]";

/** Markdown-ish inline text from the channel's files: [links](url), `code`, **bold** and *italic*. */
function Md({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = m.index;
    if (m[1])
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-acc-2 underline decoration-acc-2/30 underline-offset-[3px] hover:decoration-acc-2">
          {m[1]}
        </a>,
      );
    else if (m[3])
      out.push(
        <code key={key} className="rounded-md border border-line bg-bg-2 px-1.5 py-px font-mono text-[0.86em] text-acc-2">
          {m[3]}
        </code>,
      );
    else if (m[4])
      out.push(
        <strong key={key} className="font-semibold text-ink">
          {m[4]}
        </strong>,
      );
    else
      out.push(
        <em key={key} className="text-dim">
          {m[5]}
        </em>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** /laboratorio/videos/<slug> · /en/lab/videos/<slug>: the video and everything behind it. */
export function VideoPage({ id, lang, data }: { id: VideoId; lang: Lang; data: VideoData }) {
  const video = videoById(id);
  const lab = labById(video.lab);
  const hrefs = LAB_HREFS[lang];
  const base = siteUrl();
  const url = `${base}${videoPath(id, lang)}`;
  const title = `${t(video.title, lang)} ${t(video.accent, lang)}`;
  const english = t(VIDEO_UI.english, lang);
  const ends = data.chapters.map((c, i) => data.chapters[i + 1]?.s ?? null);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "VideoObject",
              name: video.youtubeTitle,
              description: t(video.summary, lang),
              thumbnailUrl: youtubeThumb(video.youtubeId),
              uploadDate: video.published,
              duration: video.durationIso,
              inLanguage: "en",
              contentUrl: youtubeWatch(video.youtubeId),
              embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
              url,
              publisher: { "@type": "Organization", name: SITE.name, url: base },
              hasPart: data.chapters.map((c, i) => ({
                "@type": "Clip",
                name: c.title,
                startOffset: c.s,
                ...(ends[i] !== null ? { endOffset: ends[i] } : {}),
                url: youtubeWatch(video.youtubeId, c.s),
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: t(LAB_UI.name, lang), item: `${base}${hrefs.index}` },
                { "@type": "ListItem", position: 2, name: title, item: url },
              ],
            },
          ],
        }}
      />

      <header className="relative overflow-hidden px-[var(--pad)] pt-[calc(var(--nav-h)+clamp(28px,5vw,64px))] pb-[clamp(28px,4vw,48px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[30%] right-[-18%] aspect-square w-[min(900px,110vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.1),rgb(62_242_196/0.04)_55%,transparent)]"
        />
        <div className="relative mx-auto max-w-[1360px]">
          <nav aria-label="Breadcrumb" className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
            <ol className="flex flex-wrap items-center gap-2 text-dim">
              <li>
                <Link href={hrefs.index} className="text-mute transition-colors hover:text-acc">
                  {t(LAB_UI.name, lang)}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={`${hrefs.index}#videos`} className="text-mute transition-colors hover:text-acc">
                  {t(VIDEO_UI.videos, lang)}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="max-w-[40ch] truncate text-acc">
                {video.series}
              </li>
            </ol>
          </nav>

          <h1 className="mt-8">
            <span className="label flex items-center gap-2.5">
              <span aria-hidden className="h-2 w-2 shrink-0 animate-blink rounded-full bg-acc shadow-[0_0_12px_var(--color-acc)]" />
              {t(VIDEO_UI.kind, lang)} <span className="text-dim">· {video.duration}</span>
            </span>
            <span className="mt-6 block max-w-[22ch] font-display text-[clamp(32px,4.6vw,66px)] leading-[1.03] font-extrabold tracking-[-0.045em]">
              <span className="line-mask" style={line(0)}>
                <span>{t(video.title, lang)}</span>
              </span>
              <span className="line-mask" style={line(1)}>
                <span className="text-gradient">{t(video.accent, lang)}</span>
              </span>
            </span>
          </h1>
          <Reveal as="p" delay={0.3} className="mt-6 max-w-[64ch] text-[clamp(16px,1.3vw,19px)] text-mute">
            {t(video.summary, lang)}
          </Reveal>
        </div>
      </header>

      <section aria-label={video.youtubeTitle} className={block}>
        <div className="mx-auto grid max-w-[1360px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.36fr)] lg:gap-14">
          <VideoPlayer
            youtubeId={video.youtubeId}
            title={video.youtubeTitle}
            playLabel={t(VIDEO_UI.play, lang)}
            chapters={data.chapters}
            chaptersLabel={t(VIDEO_UI.chapters, lang)}
            chaptersHint={t(VIDEO_UI.chaptersHint, lang)}
          />
          <aside className="lg:pt-2">
            <p className="font-mono text-[12px] tracking-[0.12em] text-dim uppercase">{video.youtubeTitle}</p>
            <p className="mt-5 text-[15px] leading-relaxed text-mute">{t(VIDEO_UI.channel, lang)}</p>
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-[14px] text-dim">
                {t(lab.title, lang)} {t(lab.accent, lang)}
              </p>
              <Button href={hrefs.item(video.lab)} className="w-full">
                {t(VIDEO_UI.tryIt, lang)}
              </Button>
              <Button href={youtubeWatch(video.youtubeId)} variant="ghost" arrow="↗" target="_blank" rel="noopener noreferrer" className="w-full">
                {t(VIDEO_UI.watchOn, lang)}
              </Button>
              <Button href={QUARXEL.url} variant="ghost" arrow="↗" target="_blank" rel="noopener noreferrer" className="w-full">
                {t(VIDEO_UI.subscribe, lang)} {QUARXEL.handle}
              </Button>
            </div>
            {english && <p className="mt-6 text-[13.5px] leading-relaxed text-dim">{english}</p>}
          </aside>
        </div>
      </section>

      <section aria-labelledby="video-about" className={block}>
        <div className="mx-auto grid max-w-[1360px] gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="video-about" className={h2}>
              {t(VIDEO_UI.about, lang)}
            </h2>
            <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-mute" lang="en">
              {data.description.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            {video.next && (
              <p className="mt-6 text-[15px] text-mute">
                <span className="label mr-2">{t(VIDEO_UI.next, lang)}</span>
                {t(video.next, lang)}
              </p>
            )}
          </div>
          <div>
            <h2 className={h2}>{t(VIDEO_UI.howMade, lang)}</h2>
            <ul className="mt-6 space-y-3 text-[15.5px] leading-relaxed text-mute">
              {VIDEO_UI.howMadeLines.map((l) => (
                <li key={l.en} className="flex gap-3">
                  <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-acc" />
                  {t(l, lang)}
                </li>
              ))}
            </ul>

            <h2 className={`${h2} mt-12`}>{t(VIDEO_UI.corrections, lang)}</h2>
            {video.corrections.length ? (
              <ul className="mt-6 space-y-3 text-[15.5px] text-mute">
                {video.corrections.map((c) => (
                  <li key={c.date + c.text.en}>
                    <span className="font-mono text-[12px] text-acc">{c.date}</span> {t(c.text, lang)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-[15.5px] leading-relaxed text-mute">{t(VIDEO_UI.noCorrections, lang)}</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="video-sources" className={block}>
        <div className="mx-auto max-w-[1360px]">
          <h2 id="video-sources" className={h2}>
            {t(VIDEO_UI.sources, lang)} <span className="text-dim">({data.sources.reduce((n, g) => n + g.items.length, 0)})</span>
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-3" lang="en">
            {data.sources.map((group) => (
              <div key={group.topic ?? "sources"}>
                {group.topic && <h3 className="label">{group.topic}</h3>}
                <ul className="mt-3 space-y-2.5 text-[14.5px] leading-snug">
                  {group.items.map((s) => (
                    <li key={s.url + s.label}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-mute transition-colors hover:text-acc-2">
                        {s.label} <span aria-hidden className="text-acc-2">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {data.sourcesNote && (
            <p className="mt-8 max-w-[80ch] text-[14px] text-dim" lang="en">
              {data.sourcesNote}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="video-research" className={block}>
        <div className="mx-auto max-w-[1360px]">
          <h2 id="video-research" className={h2}>
            {t(VIDEO_UI.research, lang)}
          </h2>
          <p className="mt-4 max-w-[70ch] text-[15.5px] leading-relaxed text-mute">{t(VIDEO_UI.researchLead, lang)}</p>
          <p className="mt-2 font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{data.factCheckTitle}</p>

          <div className="mt-10 space-y-14" lang="en">
            {data.research.map((sec) => (
              <div key={sec.title}>
                <h3 className="font-display text-[clamp(19px,1.8vw,24px)] font-semibold tracking-[-0.02em] text-ink">{sec.title}</h3>
                <div className="mt-5 space-y-5">
                  {sec.blocks.map((b, i) =>
                    b.type === "p" ? (
                      <p key={i} className="max-w-[90ch] text-[15px] leading-relaxed text-mute">
                        <Md text={b.text} />
                      </p>
                    ) : b.type === "list" ? (
                      <ul key={i} className="max-w-[90ch] space-y-2.5 text-[15px] leading-relaxed text-mute">
                        {b.items.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-acc-2" />
                            <span>
                              <Md text={item} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div key={i} className="card overflow-x-auto rounded-[16px]">
                        <table className="w-full min-w-[680px] border-collapse text-left text-[14px] leading-snug">
                          <thead>
                            <tr>
                              {b.head.map((h) => (
                                <th key={h} scope="col" className="border-b border-line px-4 py-3 font-mono text-[11px] font-medium tracking-[0.1em] text-dim uppercase">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {b.rows.map((row) => (
                              <tr key={row.join("|")} className="align-top">
                                {row.map((cell, ci) => (
                                  <td key={ci} className={`border-b border-line/60 px-4 py-3 ${ci === 0 ? "text-ink" : "text-mute"}`}>
                                    <Md text={cell} />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="video-narration" className={block}>
        <div className="mx-auto max-w-[1360px]">
          <h2 id="video-narration" className={h2}>
            {t(VIDEO_UI.narration, lang)}
          </h2>
          <details className="card group mt-8 rounded-[16px] px-5 py-4 sm:px-7">
            <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
              <span className="mr-2 inline-block text-acc transition-transform group-open:rotate-90">›</span>
              {t(VIDEO_UI.narrationOpen, lang)}
            </summary>
            <div className="mt-6 space-y-10 pb-2" lang="en">
              {data.narration.map((scene) => (
                <div key={scene.id}>
                  <h3 className="font-mono text-[12px] tracking-[0.12em] text-acc uppercase">
                    {scene.id} · {scene.name}
                    {scene.clock && <span className="text-dim"> · {scene.clock}</span>}
                  </h3>
                  <div className="mt-3 max-w-[75ch] space-y-3 text-[15.5px] leading-relaxed text-mute">
                    {scene.paragraphs.map((p, i) => (
                      <p key={i}>
                        <Md text={p} />
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      <LabCta lang={lang} />
    </>
  );
}
