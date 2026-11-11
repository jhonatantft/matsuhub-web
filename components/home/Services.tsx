import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SERVICES } from "@/content/site";
import { AgentGraph } from "./parts-a/AgentGraph";
import { DashboardViz } from "./parts-a/DashboardViz";
import { FlowViz } from "./parts-a/FlowViz";
import { ServiceCard } from "./parts-a/ServiceCard";
import { SiteStack } from "./parts-a/SiteStack";

const LAYOUT: Record<(typeof SERVICES)[number]["id"], { span: string; caption: string; viz: React.ReactNode }> = {
  agentes: { span: "lg:col-span-7", caption: "agente · ferramentas", viz: <AgentGraph /> },
  webapps: { span: "lg:col-span-5", caption: "painel · tempo real", viz: <DashboardViz /> },
  sites: { span: "lg:col-span-5", caption: "camadas · 3D", viz: <SiteStack /> },
  automacao: { span: "lg:col-span-7", caption: "fluxo · integrações", viz: <FlowViz /> },
};

/** "01 — O que construímos": bento of four services, each with a living illustration. */
export function Services() {
  return (
    <section id="servicos" className="relative px-[var(--pad)] py-[clamp(80px,11vw,150px)]">
      <SectionHeader
        label="01 — O que construímos"
        title="Do site que vende ao agente que fecha."
        sub="Engenharia e design no mesmo time. Entregamos software pronto para produção — não apresentações."
      />
      <div className="mt-[clamp(40px,5vw,64px)] grid grid-cols-1 gap-4 lg:grid-cols-12">
        {SERVICES.map((s, i) => {
          const l = LAYOUT[s.id];
          return (
            <Reveal key={s.id} delay={(i % 2) * 0.1} className={l.span}>
              <ServiceCard index={i} title={s.title} text={s.text} tags={s.tags} caption={l.caption}>
                {l.viz}
              </ServiceCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
