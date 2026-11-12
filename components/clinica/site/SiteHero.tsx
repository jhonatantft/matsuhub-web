"use client";

import { useEffect, useState } from "react";
import { ClinicTour } from "@/components/clinica/tour/ClinicTour";
import { ELO } from "@/content/clinica";
import { onTour, scrollToSection, SECTION } from "./bus";

/**
 * The hero: the interactive clinic tour, full viewport, with Elo's opening copy laid over it
 * while the tour shows the facade. The copy never takes pointer events (the door stays
 * clickable) and fades away as soon as the tour goes inside.
 */
export function SiteHero() {
  const [facade, setFacade] = useState(true);

  useEffect(() => onTour("elo:state", (d) => setFacade(d.state === "fachada")), []);

  return (
    <section id={SECTION.tour} aria-label="Conheça a Elo por dentro" className="relative h-svh min-h-[620px] overflow-hidden bg-el-bg">
      {/* the tour keeps 72 px (narrow) / 96 px (from 768 px) clear at its top for a header: line that band up with Elo's header under the demo bar */}
      <div className="absolute inset-x-0 bottom-0 top-[calc(var(--demo-bar-h,0px)+64px-72px)] md:top-[calc(var(--demo-bar-h,0px)+64px-96px)]">
        <ClinicTour className="h-full w-full" />
      </div>

      <div
        data-show={facade}
        aria-hidden={!facade}
        className="group/hero pointer-events-none absolute inset-0 transition-opacity duration-700 ease-soft data-[show=false]:opacity-0"
      >
        {/* linen shade where the copy sits: right side on wide screens; top and bottom bands on phones (the door, at the left, stays clear) */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(246_243_238/0.96)_0%,rgb(246_243_238/0.82)_26%,transparent_44%),linear-gradient(to_top,rgb(246_243_238/0.97)_0%,rgb(246_243_238/0.86)_22%,transparent_38%)] md:bg-[linear-gradient(to_left,rgb(246_243_238/0.97)_0%,rgb(246_243_238/0.9)_34%,rgb(246_243_238/0.5)_50%,transparent_64%)]"
        />

        <div className="absolute inset-0 flex flex-col justify-between px-[var(--pad)] pt-[calc(var(--demo-bar-h,0px)+84px)] pb-[max(20px,3vh)] md:left-auto md:w-[min(48vw,640px)] md:justify-center md:pt-[calc(var(--demo-bar-h,0px)+64px)] md:pb-0">
          <div>
            <p className="font-elo text-[13px] font-medium tracking-[0.16em] text-el-acc uppercase">{ELO.address}</p>
            <h1 className="mt-3 font-elo text-[clamp(38px,5.4vw,76px)] leading-[1.02] font-medium tracking-[-0.035em] text-el-ink">
              {ELO.full}
            </h1>
            <p className="mt-3 max-w-[26ch] text-[clamp(18px,1.6vw,23px)] leading-snug text-el-ink/80 md:mt-5">{ELO.tagline}</p>
          </div>

          <div className="md:mt-10">
            <dl className="grid max-w-[520px] grid-cols-2 gap-x-6 gap-y-3 border-t border-el-ink/12 pt-4 sm:grid-cols-4 md:grid-cols-2 md:gap-y-5 md:pt-6">
              {ELO.facts.map((f) => (
                <div key={f.label}>
                  <dt className="font-elo text-[19px] leading-none font-medium text-el-ink md:text-[22px]">{f.value}</dt>
                  <dd className="mt-1.5 text-[13px] leading-snug text-el-mute">{f.label}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-8">
              <p className="flex items-center gap-3 rounded-full border border-el-acc/35 bg-el-bg-2/90 py-3 pr-5 pl-3.5 font-elo text-[14.5px] text-el-ink shadow-[0_12px_30px_-18px_rgb(20_32_31/0.45)]">
                <span aria-hidden className="relative grid h-3 w-3 place-items-center">
                  <i className="absolute inset-0 animate-ping rounded-full bg-el-acc/50 motion-reduce:animate-none" />
                  <i className="h-2 w-2 rounded-full bg-el-acc" />
                </span>
                <span className="pointer-coarse:hidden">Clique na porta para entrar</span>
                <span className="hidden pointer-coarse:inline">Toque na porta para entrar</span>
              </p>
              <a
                href={`#${SECTION.booking}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection(SECTION.booking);
                }}
                tabIndex={facade ? 0 : -1}
                className="font-elo text-[14.5px] text-el-ink underline decoration-el-ink/30 underline-offset-[5px] transition-colors group-data-[show=true]/hero:pointer-events-auto hover:text-el-acc"
              >
                ou agende direto ↓
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
