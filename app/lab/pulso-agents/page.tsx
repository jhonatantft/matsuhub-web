import { notFound } from "next/navigation";
import { AgentReady } from "@/components/pulso/agents/AgentReady";
import { PulsoJsonLd } from "@/components/pulso/agents/PulsoJsonLd";

export const metadata = { title: "Lab · Pulso agentes", robots: { index: false } };

/** Dev-only bench for the Pulso "Para agentes" section (components/pulso/agents). */
export default function LabPulsoAgents() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10 min-h-svh bg-pu-bg font-sans">
      <PulsoJsonLd />
      <section id="agentes" className="py-[clamp(64px,9vw,120px)]">
        <AgentReady />
      </section>
    </main>
  );
}
