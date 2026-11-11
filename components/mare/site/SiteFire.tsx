"use client";

import Image from "next/image";
import { MARE_ZONES } from "@/content/mare";
import { emitSite, scrollToSection, SECTION } from "./bus";
import { Embers } from "./Embers";
import { Eyebrow } from "./SiteSection";

const CHEF = MARE_ZONES.find((z) => z.id === "balcao")!;

const POINTS = [
  { title: "Lenha à vista", text: "A lenha fica empilhada ao lado da grelha, à vista de quem senta no balcão." },
  { title: "Balcão do chef", text: `${CHEF.note}: dá para acompanhar cada prato saindo da brasa.` },
  { title: "Peixe do dia", text: "O cardápio segue o que a costa trouxe. Quando o peixe acaba, acaba." },
];

/** "A brasa": the wood-fired grill, told over the chef's-counter photo, with embers that follow the pointer. */
export function SiteFire() {
  return (
    <section id={SECTION.fire} aria-labelledby="mare-fire-title" className="relative isolate scroll-mt-[calc(var(--demo-bar-h,0px)+60px)] overflow-hidden bg-ma-bg">
      <div className="absolute inset-0 -z-10 max-md:bottom-auto max-md:h-[75svh]">
        <Image src={CHEF.view.small} alt={CHEF.view.alt} fill sizes="100vw" className="object-cover object-[60%_50%]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(15_12_10/0.96)_0%,rgb(15_12_10/0.82)_34%,rgb(15_12_10/0.25)_70%,rgb(15_12_10/0.4)_100%)] max-md:bg-[linear-gradient(to_top,rgb(15_12_10/1)_0%,rgb(15_12_10/0.7)_35%,rgb(15_12_10/0.1)_75%)]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ma-bg to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ma-bg to-transparent" />
      </div>
      <Embers className="pointer-events-none absolute inset-0 -z-[5] h-full w-full" />

      <div className="mx-auto flex min-h-[min(100svh,960px)] max-w-[1320px] flex-col justify-center px-[var(--pad)] py-[clamp(110px,12vw,170px)] max-md:min-h-0 max-md:pt-[52vh]">
        <div className="max-w-[560px]">
          <Eyebrow>A brasa</Eyebrow>
          <h2 id="mare-fire-title" className="mt-6 font-mare text-[clamp(46px,6vw,92px)] leading-[0.94] font-light tracking-[-0.01em]">
            Tudo passa <em className="text-ma-ember italic">pelo fogo.</em>
          </h2>
          <p className="mt-7 text-[16.5px] leading-relaxed text-ma-ink/85">
            Não há fogão escondido. A grelha a lenha fica no centro da casa, sob a coifa de cobre, e é por ela que passam o
            polvo, o peixe do dia, os camarões e até o limão que vai ao lado.
          </p>
          <ul className="mt-10 grid gap-6 border-t border-ma-line pt-8 sm:grid-cols-3 sm:gap-8">
            {POINTS.map((p) => (
              <li key={p.title}>
                <p className="font-mare text-[22px] leading-tight italic text-ma-ember">{p.title}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ma-mute">{p.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href={`#${SECTION.reserve}`}
              onClick={(event) => {
                event.preventDefault();
                emitSite("reserve", { tableId: "B1" });
                scrollToSection(SECTION.reserve);
              }}
              className="group flex items-center gap-3 rounded-full border border-ma-ember/70 px-6 py-3.5 text-[10.5px] leading-none font-bold tracking-[0.22em] uppercase transition-colors hover:bg-ma-ember hover:text-ma-bg"
            >
              Reservar o balcão do chef
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
            <p aria-hidden className="text-[12px] text-ma-mute pointer-coarse:hidden">
              Passe o cursor: as brasas respondem.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
