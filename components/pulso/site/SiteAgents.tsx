import { AgentReady } from "@/components/pulso/agents/AgentReady";

/** "Para agentes": the anchor and frame; the content belongs to components/pulso/agents. */
export function SiteAgents() {
  return (
    <section id="agentes" aria-label="Para agentes" className="relative scroll-mt-[calc(var(--demo-bar-h,0px)+56px)] border-t border-pu-line bg-pu-bg py-[clamp(72px,9vw,128px)]">
      <AgentReady />
    </section>
  );
}
