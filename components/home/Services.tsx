import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HOME, SERVICES, type ServiceId } from "@/content/site";
import { sectionId, t, type Lang } from "@/lib/i18n";
import { AgentGraph } from "./parts-a/AgentGraph";
import { DashboardViz } from "./parts-a/DashboardViz";
import { FlowViz } from "./parts-a/FlowViz";
import { ServiceCard } from "./parts-a/ServiceCard";
import { SiteStack } from "./parts-a/SiteStack";

const SPAN: Record<ServiceId, string> = {
  agentes: "lg:col-span-7",
  webapps: "lg:col-span-5",
  sites: "lg:col-span-5",
  automacao: "lg:col-span-7",
};

function Viz({ id, lang }: { id: ServiceId; lang: Lang }) {
  if (id === "agentes") return <AgentGraph lang={lang} />;
  if (id === "webapps") return <DashboardViz lang={lang} />;
  if (id === "sites") return <SiteStack lang={lang} />;
  return <FlowViz lang={lang} />;
}

/** "01 — O que construímos": bento of four services, each with a living illustration. */
export function Services({ lang = "pt" }: { lang?: Lang }) {
  const copy = HOME.services;
  return (
    <section id={sectionId("services", lang)} className="relative px-[var(--pad)] py-[clamp(80px,11vw,150px)]">
      <SectionHeader label={t(copy.label, lang)} title={t(copy.title, lang)} sub={t(copy.sub, lang)} />
      <div className="mt-[clamp(40px,5vw,64px)] grid grid-cols-1 gap-4 lg:grid-cols-12">
        {SERVICES.map((s, i) => (
          <Reveal key={s.id} delay={(i % 2) * 0.1} className={SPAN[s.id]}>
            <ServiceCard
              index={i}
              title={t(s.title, lang)}
              text={t(s.text, lang)}
              tags={s.tags}
              caption={t(s.caption, lang)}
              lang={lang}
            >
              <Viz id={s.id} lang={lang} />
            </ServiceCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
