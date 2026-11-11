"use client";

import Image from "next/image";
import { MARE, MARE_ZONES } from "@/content/mare";
import { scrollToSection, SECTION } from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

const TERRACE = MARE_ZONES.find((z) => z.id === "terraco")!;

/** "Onde & horários": address, hours, how to arrive, with the terrace photo. No embedded map. */
export function SiteWhere() {
  return (
    <SiteSection id={SECTION.where} className="bg-ma-bg">
      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <figure className="relative">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[26px] ring-1 ring-ma-line max-sm:-mx-[var(--pad)] max-sm:aspect-[4/3] max-sm:rounded-none">
            <Image src={TERRACE.view.small} alt={TERRACE.view.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          </div>
          <figcaption className="mt-3 text-[12px] text-ma-mute">
            {TERRACE.name}: {TERRACE.note.toLowerCase()}.
          </figcaption>
        </figure>

        <div>
          <SiteHeading
            eyebrow="Onde & horários"
            title={
              <>
                De frente <em>para o mar.</em>
              </>
            }
          />
          <address className="mt-8 font-mare text-[clamp(24px,2.4vw,32px)] leading-snug not-italic">{MARE.address}</address>

          <dl className="mt-8 grid gap-3 border-t border-ma-line pt-6 text-[14.5px]">
            {MARE.hours.map((h) => (
              <div key={h.days} className="flex justify-between gap-6">
                <dt className="text-ma-mute">{h.days}</dt>
                <dd className="text-right lining-nums tabular-nums">{h.time}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-6">
              <dt className="text-ma-mute">Segunda e terça</dt>
              <dd className="text-right">fechado</dd>
            </div>
          </dl>

          <p className="mt-6 max-w-[46ch] text-[14px] leading-relaxed text-ma-mute">
            Chegando: a entrada fica na própria avenida, de frente para a praia. Há estacionamento nas ruas do entorno; em
            noites cheias, vale vir de táxi ou aplicativo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {/* TODO: real WhatsApp link (https://wa.me/<número>) when this becomes a client site */}
            <a
              href="#"
              onClick={(event) => event.preventDefault()}
              className="flex items-center gap-3 rounded-full border border-ma-line px-6 py-3.5 text-[10.5px] leading-none font-bold tracking-[0.22em] uppercase transition-colors hover:border-ma-ember hover:text-ma-ember"
            >
              WhatsApp
            </a>
            <a
              href={`#${SECTION.reserve}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(SECTION.reserve);
              }}
              className="flex items-center gap-3 rounded-full bg-ma-ember px-6 py-3.5 text-[10.5px] leading-none font-bold tracking-[0.22em] text-ma-bg uppercase transition-colors hover:bg-ma-ink"
            >
              Reservar <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </SiteSection>
  );
}
