import { ToolIcon } from "@/components/home/parts-b/icons";
import { Reveal } from "@/components/ui/Reveal";
import { fill, SEGMENT_UI, t, type Lang, type Segment } from "@/content/segments";
import { SplitHeader } from "./SplitHeader";

/** "04 — Integrações": the categories of systems the site and the agent plug into (no brand names). */
export function SegmentIntegrations({ segment, lang }: { segment: Segment; lang: Lang }) {
  const ui = SEGMENT_UI.integrations;
  return (
    <section aria-labelledby="integracoes-title" className="relative px-[var(--pad)] py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-[1360px]">
        <SplitHeader id="integracoes-title" label={t(ui.label, lang)} title={t(ui.title, lang)} lead={t(segment.integrations.lead, lang)} />

        <div className="relative mt-10 lg:mt-14">
          {/* the hub: everything meets in the site + agent */}
          <div
            aria-hidden
            className="mb-4 flex items-center gap-3 font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase"
          >
            <span className="flex items-center gap-2 rounded-full border border-acc/40 bg-acc/[0.06] px-3 py-1.5 text-acc">
              <i className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)] motion-safe:animate-pulse" />
              {fill(t(ui.hub, lang), { role: t(segment.agent.role, lang) })}
            </span>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--color-line-2),transparent)]" />
          </div>

          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {segment.integrations.items.map((item, i) => (
              <Reveal as="li" key={item.title[lang]} delay={0.05 * i} className="group flex gap-4 bg-bg/95 px-5 py-5 sm:px-6 sm:py-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-line-2 bg-[linear-gradient(160deg,rgb(185_255_75/0.12),rgb(62_242_196/0.04))] text-acc transition-colors duration-300 group-hover:border-acc/60">
                  <ToolIcon name={item.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[16px] leading-snug font-bold text-ink">{t(item.title, lang)}</span>
                  <span className="mt-1 block text-[14.5px] leading-snug text-mute">{t(item.text, lang)}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>

        <p className="mt-5 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-mute">{t(ui.note, lang)}</p>
      </div>
    </section>
  );
}
