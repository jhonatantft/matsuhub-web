import { Label } from "@/components/ui/Label";
import { Reveal } from "@/components/ui/Reveal";
import { HOME, PROCESS } from "@/content/site";
import { sectionId, t, type Lang } from "@/lib/i18n";
import { Principles } from "./process/Principles";
import { ProcessStage } from "./process/ProcessStage";

/** "04 — Processo": one sample project played on a stage — short way in, a feedback loop with the client, then evolution. */
export function Process({ lang = "pt" }: { lang?: Lang }) {
  return (
    <section id={sectionId("process", lang)} className="relative px-[var(--pad)] py-[clamp(80px,11vw,150px)]">
      <div className="mx-auto max-w-[1360px]">
        <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <Reveal>
              <Label>{t(HOME.process.label, lang)}</Label>
            </Reveal>
            <Reveal as="h2" delay={0.06} className="h-section mt-[18px] max-w-[16ch]">
              {t(PROCESS.title, lang)} <span className="text-gradient">{t(PROCESS.titleAccent, lang)}</span>
            </Reveal>
          </div>
          <Reveal as="p" delay={0.1} className="max-w-[48ch] text-[clamp(16px,1.25vw,18px)] text-mute">
            {t(PROCESS.lead, lang)}
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-10 lg:mt-14">
          <ProcessStage lang={lang} />
        </Reveal>

        <p className="mt-5 text-center font-mono text-[11px] tracking-[0.06em] text-mute">{t(PROCESS.note, lang)}</p>

        <Principles lang={lang} />
      </div>
    </section>
  );
}
