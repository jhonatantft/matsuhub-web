import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { LAB_HREFS, LAB_UI, readingMinutes, type LabBlock, type LabId, type LabItem } from "@/content/lab";
import { LAB_BODIES } from "@/content/lab/bodies";
import { SEGMENT_HREFS } from "@/content/segments";
import { fill, sectionHref, t, type Lang } from "@/lib/i18n";

/** Shared pieces of the Lab pages (server components). */

/** Text with `inline code` spans. */
function Inline({ text }: { text: string }) {
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <code key={i} className="rounded-md border border-line bg-bg-2 px-1.5 py-px font-mono text-[0.86em] text-acc-2">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function LabBody({ blocks, lang }: { blocks: readonly LabBlock[]; lang: Lang }) {
  return (
    <div className="max-w-[70ch] text-[clamp(16px,1.2vw,18px)] leading-[1.75] text-ink/85">
      {blocks.map((b, i) => {
        if (b.type === "h2")
          return (
            <h2 key={i} className="mt-14 mb-4 font-display text-[clamp(21px,2vw,27px)] leading-tight font-semibold tracking-[-0.02em] text-ink first:mt-0">
              {t(b.text, lang)}
            </h2>
          );
        if (b.type === "p")
          return (
            <p key={i} className="mt-5 first:mt-0">
              <Inline text={t(b.text, lang)} />
            </p>
          );
        if (b.type === "list") {
          const List = b.ordered ? "ol" : "ul";
          return (
            <List key={i} className="mt-5 grid gap-3">
              {b.items.map((item, j) => (
                <li key={j} className="relative pl-8">
                  <span aria-hidden className="absolute top-[0.2em] left-0 font-mono text-[12px] text-acc">
                    {b.ordered ? `0${j + 1}` : "—"}
                  </span>
                  <Inline text={t(item, lang)} />
                </li>
              ))}
            </List>
          );
        }
        if (b.type === "code")
          return (
            <figure key={i} className="my-7">
              <pre className="overflow-x-auto rounded-[16px] border border-line bg-[rgb(7_13_10/0.92)] p-5 font-mono text-[12.5px] leading-[1.7] text-ink/90 sm:text-[13px]">
                <code>{b.code}</code>
              </pre>
              {b.caption && <figcaption className="mt-2 font-mono text-[11px] tracking-[0.08em] text-dim uppercase">{t(b.caption, lang)}</figcaption>}
            </figure>
          );
        return (
          <p key={i} className="my-7 rounded-[16px] border border-acc/25 bg-acc/[0.05] px-5 py-4 text-[0.95em] text-ink">
            <Inline text={t(b.text, lang)} />
          </p>
        );
      })}
    </div>
  );
}

/** Small line drawing of each experiment for the cards. */
export function LabArt({ id }: { id: LabId }) {
  if (id === "load-test")
    return (
      <svg aria-hidden viewBox="0 0 240 150" className="h-full w-full">
        {[0, 1, 2].map((layer) => {
          const y = 34 + layer * 40;
          return (
            <g key={layer} opacity={layer === 1 ? 1 : 0.7}>
              <path d={`M120 ${y - 22} 200 ${y} 120 ${y + 22} 40 ${y}Z`} fill={layer === 1 ? "rgb(185 255 75 / 0.06)" : "none"} stroke="currentColor" strokeOpacity={layer === 1 ? 0.7 : 0.35} />
              {layer === 1 &&
                [-2, -1, 0, 1, 2].map((k) => (
                  <rect key={k} x={113 + k * 15} y={y - 12 + Math.abs(k) * 2} width="10" height="14" rx="2" fill="currentColor" fillOpacity={Math.abs(k) < 2 ? 0.7 : 0.25} />
                ))}
            </g>
          );
        })}
        {[60, 92, 148, 178].map((x, i) => (
          <circle key={x} r="2" fill="var(--color-acc-2)" className="motion-reduce:hidden">
            <animateMotion dur="2.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" path={`M${x} 0 L${x} 40 L120 74 L120 114`} />
          </circle>
        ))}
      </svg>
    );
  if (id === "semantic-search") {
    const pts = [
      [52, 44], [64, 36], [70, 52], [58, 58], [46, 54],
      [178, 38], [190, 48], [172, 52], [186, 30],
      [64, 112], [76, 104], [54, 120], [80, 120],
      [170, 110], [182, 118], [162, 120], [178, 98],
    ];
    const hits = [5, 6, 7];
    return (
      <svg aria-hidden viewBox="0 0 240 150" className="h-full w-full">
        {hits.map((h) => (
          <line key={h} x1="128" y1="70" x2={pts[h][0]} y2={pts[h][1]} stroke="var(--color-acc)" strokeOpacity="0.6" strokeDasharray="3 3" />
        ))}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={hits.includes(i) ? 4 : 2.6} fill={hits.includes(i) ? "var(--color-acc)" : "currentColor"} fillOpacity={hits.includes(i) ? 1 : 0.45} />
        ))}
        <circle cx="128" cy="70" r="5" fill="var(--color-acc-2)" />
        <circle cx="128" cy="70" r="11" fill="none" stroke="var(--color-acc-2)" strokeOpacity="0.5" className="origin-[128px_70px] motion-safe:animate-ping" />
      </svg>
    );
  }
  return null;
}

/** A card linking to one Lab item. */
export function LabCard({ item, lang, big = false }: { item: LabItem; lang: Lang; big?: boolean }) {
  const href = LAB_HREFS[lang].item(item.id);
  const isNote = item.kind === "note";
  const minutes = isNote ? readingMinutes(LAB_BODIES[item.id], lang) : 0;
  return (
    <Link
      href={href}
      className="group card relative flex h-full flex-col overflow-hidden p-6 transition-colors hover:border-acc/40 sm:p-7"
    >
      {!isNote && (
        <span className="relative mb-6 block aspect-[16/9] overflow-hidden rounded-[14px] border border-line bg-[rgb(7_13_10/0.7)] p-4 text-ink [background-image:linear-gradient(rgb(185_255_75/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(185_255_75/0.05)_1px,transparent_1px)] [background-size:20px_20px]">
          <LabArt id={item.id} />
        </span>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.14em] uppercase">
        <span className="text-acc">{t(LAB_UI.kind[item.kind], lang)}</span>
        {isNote && <span className="text-dim">{fill(t(LAB_UI.index.minutes, lang), { n: String(minutes) })}</span>}
      </span>
      <span className={`mt-3 block font-display leading-[1.1] font-semibold tracking-[-0.025em] ${big ? "text-[clamp(22px,2.2vw,30px)]" : "text-[clamp(19px,1.6vw,23px)]"}`}>
        {t(item.title, lang)} <span className="text-gradient">{t(item.accent, lang)}</span>
      </span>
      <span className="mt-3 block text-[15px] leading-relaxed text-mute">{t(item.summary, lang)}</span>
      <span className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-6">
        <span className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </span>
        <span className="font-mono text-[11px] tracking-[0.12em] text-acc uppercase">
          {t(isNote ? LAB_UI.index.read : LAB_UI.index.open, lang)} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </span>
      </span>
    </Link>
  );
}

export function LabCta({ lang }: { lang: Lang }) {
  const ui = LAB_UI.item;
  return (
    <section aria-labelledby="lab-cta-title" className="relative px-[var(--pad)] pb-[clamp(72px,9vw,140px)]">
      <Reveal className="card relative mx-auto max-w-[1360px] overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgb(185_255_75/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(185_255_75/0.05)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(closest-side,black,transparent)]"
        />
        <h2 id="lab-cta-title" className="relative font-display text-[clamp(26px,3.4vw,46px)] leading-[1.05] font-bold tracking-[-0.035em]">
          {t(ui.ctaTitle, lang)}
        </h2>
        <p className="relative mx-auto mt-4 max-w-[52ch] text-[clamp(16px,1.25vw,18px)] text-mute">{t(ui.ctaText, lang)}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3 max-sm:flex-col">
          <Button href={sectionHref("contact", lang)} className="max-sm:w-full">
            {t(ui.ctaButton, lang)}
          </Button>
          <Button href={SEGMENT_HREFS[lang].custom} variant="ghost" className="max-sm:w-full">
            {t(ui.ctaSecondary, lang)}
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
