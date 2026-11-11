"use client";

import { useEffect, useState } from "react";
import { SalonTour } from "@/components/mare/tour/SalonTour";
import { MARE } from "@/content/mare";
import { onTour, scrollToSection, SECTION } from "./bus";

/**
 * The hero: the interactive salon tour, full viewport, with Maré's opening copy laid over it
 * while the tour shows the facade. The copy never takes pointer events (the door stays
 * clickable) and fades away as soon as the tour enters the room.
 */
export function SiteSalon() {
  const [facade, setFacade] = useState(true);

  useEffect(() => onTour("mare:state", (d) => setFacade(d.state === "fachada")), []);

  return (
    <section id={SECTION.salon} aria-label="Salão do Maré" className="relative h-svh min-h-[600px] scroll-mt-0 overflow-hidden bg-ma-bg">
      <div className="absolute inset-0">
        <SalonTour className="h-full w-full" />
      </div>

      <div
        data-show={facade}
        aria-hidden={!facade}
        className="group/hero pointer-events-none absolute inset-0 transition-opacity duration-700 ease-soft data-[show=false]:opacity-0"
      >
        {/* shade where the copy sits: right side on wide screens; top and bottom bands on phones (the door stays clear) */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(15_12_10/0.9)_0%,rgb(15_12_10/0.6)_30%,transparent_46%),linear-gradient(to_top,rgb(15_12_10/0.92)_0%,rgb(15_12_10/0.5)_16%,transparent_28%)] md:bg-[linear-gradient(to_left,rgb(15_12_10/0.94)_0%,rgb(15_12_10/0.74)_32%,transparent_60%),linear-gradient(to_top,rgb(15_12_10/0.7)_0%,transparent_30%)]"
        />

        <div className="absolute inset-0 flex flex-col justify-between px-[var(--pad)] pt-[calc(var(--demo-bar-h,0px)+74px)] pb-[max(20px,3vh)] md:left-auto md:w-[min(46vw,620px)] md:justify-end md:pt-0 md:pb-[clamp(96px,12vh,128px)]">
          <div>
          <p className="text-[10.5px] font-semibold tracking-[0.3em] text-ma-ember uppercase">{MARE.address}</p>
          <h1 className="mt-3 font-mare text-[clamp(64px,11vw,168px)] leading-[0.82] font-light tracking-[-0.02em] text-ma-ink">
            {MARE.name}
            <span className="mt-2 block text-[0.32em] leading-none font-normal tracking-normal text-ma-ember italic">
              {MARE.tagline}
            </span>
          </h1>
          <p className="mt-3 max-w-[30ch] font-mare text-[clamp(19px,2vw,27px)] leading-snug text-ma-ink/90 md:mt-5">{MARE.claim}</p>
          </div>

          <div>

          <dl className="grid grid-cols-4 gap-x-3 border-t border-ma-line pt-4 md:mt-7 md:gap-x-4 md:pt-5">
            {MARE.facts.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="font-mare text-[19px] leading-none text-ma-ink md:text-[24px]">{f.value}</dd>
                <dd className="mt-1.5 text-[10px] leading-snug text-ma-mute md:text-[11px]">{f.label}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-7">
            <p className="flex items-center gap-3 rounded-full border border-ma-ember/50 bg-ma-bg/60 py-2.5 pr-5 pl-3 text-[12.5px] text-ma-ink backdrop-blur-md">
              <span aria-hidden className="relative grid h-3 w-3 place-items-center">
                <i className="absolute inset-0 animate-ping rounded-full bg-ma-ember/60 motion-reduce:animate-none" />
                <i className="h-2 w-2 rounded-full bg-ma-ember" />
              </span>
              <span className="pointer-coarse:hidden">Clique na porta para entrar</span>
              <span className="hidden pointer-coarse:inline">Toque na porta para entrar</span>
            </p>
            <a
              href={`#${SECTION.menu}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(SECTION.menu);
              }}
              tabIndex={facade ? 0 : -1}
              className="text-[12.5px] group-data-[show=true]/hero:pointer-events-auto text-ma-mute underline decoration-ma-line underline-offset-4 transition-colors hover:text-ma-ink"
            >
              ou veja o cardápio ↓
            </a>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
