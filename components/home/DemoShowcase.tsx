import { ShowcaseScene } from "@/components/aurora/showcase/ShowcaseScene";
import { DemoCard } from "@/components/home/DemoPreview";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DEMOS, SEGMENTS } from "@/content/site";

/**
 * "02 — Demos por segmento": the header, a picker with one big card per live demo (each playing a
 * looping recording of the real demo, see DemoCard), the segments still to come, and the pinned
 * scroll scene that plays the Aurora (real-estate) demo inside a browser window.
 */
export function DemoShowcase() {
  const upcoming = SEGMENTS.filter((segment) => !segment.href);

  return (
    <section id="demos" className="relative">
      <div className="px-[var(--pad)] pt-[clamp(80px,11vw,150px)] pb-[clamp(28px,4vw,56px)]">
        <SectionHeader
          label="02 — Demos por segmento"
          title="Veja funcionando antes de contratar."
          sub="Cada segmento ganha um site-demo vivo, com 3D, animação e um agente de IA integrado. Escolha um e abra o site completo."
        />

        <ul aria-label="Site-demos no ar" className="mt-10 grid gap-4 md:grid-cols-3 md:gap-4 lg:mt-12 lg:gap-5">
          {DEMOS.map((demo, i) => (
            <li key={demo.id}>
              <Reveal delay={0.1 + i * 0.08} className="h-full">
                <DemoCard demo={demo} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal delay={0.3} className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <p className="flex items-center gap-2.5 font-mono text-xs font-medium tracking-[0.06em] text-mute">
            <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border border-acc/50 text-acc">
              ↓
            </span>
            <span>
              <span className="text-ink">Prévia abaixo: role para ver</span> o demo de Imobiliárias sendo montado.
            </span>
          </p>
          {upcoming.length > 0 && (
            <ul aria-label="Próximos segmentos" className="flex flex-wrap items-center gap-2 font-mono text-xs text-dim">
              <li className="mr-1">Em breve:</li>
              {upcoming.map((segment) => (
                <li key={segment.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-mute">
                  {segment.title}
                  <span className="text-[9px] tracking-[0.08em] text-dim uppercase">em breve</span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>

      <ShowcaseScene />
    </section>
  );
}
