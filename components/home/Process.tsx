import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProcessLine } from "./parts-a/ProcessLine";

/** "04 — Processo": four steps on a line that draws itself as the page scrolls. */
export function Process() {
  return (
    <section id="processo" className="relative px-[var(--pad)] py-[clamp(80px,11vw,150px)]">
      <SectionHeader
        label="04 — Processo"
        title="Do briefing ao ar, sem enrolação."
        sub="Quatro etapas, cada uma com uma entrega que você vê e usa."
      />
      <ProcessLine />
    </section>
  );
}
