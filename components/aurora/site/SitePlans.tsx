"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AURORA_MEDIA, AURORA_ROOMS, AURORA_TYPES, AURORA_UNITS, brl } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { lenisRef } from "@/lib/scroll";
import { AuroraEyebrow } from "../AuroraChrome";
import { SECTION } from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

const fromPrice = (type: keyof typeof AURORA_TYPES) =>
  Math.min(...AURORA_UNITS.filter((u) => u.type === type && u.status !== "vendida").map((u) => u.price));

const SPECS = (["A", "B"] as const).map((id) => {
  const t = AURORA_TYPES[id];
  return {
    ...t,
    from: fromPrice(id),
    rows: [
      ["Área privativa", `${t.area} m²`],
      ["Suítes", `${t.suites}${id === "A" ? ", master com closet e bancada dupla" : ""}`],
      ["Vagas", `${t.vagas} cobertas`],
      ["Vista", t.face],
      ["Varanda", "Gourmet, com churrasqueira"],
    ] as const,
  };
});

/**
 * The cut-away plan, large, with a golden hotspot per room that opens its picture in a
 * lightbox; both typologies' specs beside it.
 */
export function SitePlans() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SiteSection id={SECTION.plans} className="bg-au-bg-2/60">
      <SiteHeading
        eyebrow="Plantas"
        title="Cada metro pensado para a vista."
        lead="Living, cozinha e varanda abertos para o mar; suítes recolhidas para o lado calmo. Toque nos pontos dourados para entrar em cada ambiente."
      />

      <div className="mt-14 grid gap-10 xl:grid-cols-[1fr_340px] xl:gap-14">
        <figure>
          <div
            className="relative aspect-[2688/1520] overflow-hidden border border-au-line"
            style={{ backgroundColor: AURORA_MEDIA.planBackground }}
          >
            <Image
              src={AURORA_MEDIA.plan.src}
              alt={AURORA_MEDIA.plan.alt}
              fill
              sizes="(min-width: 1280px) 900px, (min-width: 768px) 90vw, 100vw"
              className="object-cover"
            />
            {AURORA_ROOMS.map((room, i) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Ver ${room.name}`}
                className="group absolute flex -translate-x-[13px] before:absolute before:-inset-2 before:content-[''] -translate-y-1/2 items-center gap-2 focus-visible:outline-au-gold"
                style={{ left: `${room.plan.x * 100}%`, top: `${room.plan.y * 100}%` }}
              >
                <span className="relative grid h-[26px] w-[26px] place-items-center">
                  <i aria-hidden className="absolute inset-0 animate-ping rounded-full bg-au-gold/40 [animation-duration:2.8s]" />
                  <i
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-au-gold bg-au-bg/60 backdrop-blur-[2px] transition-[background-color,scale] duration-300 group-hover:scale-110 group-hover:bg-au-gold"
                  />
                  <span className="relative text-[10.5px] leading-none font-bold text-au-gold tabular-nums group-hover:text-au-bg">
                    {i + 1}
                  </span>
                </span>
                <span className="border border-au-line bg-au-bg/85 px-2.5 py-1.5 text-[9.5px] leading-none font-semibold tracking-[0.2em] whitespace-nowrap text-au-ink uppercase backdrop-blur-md transition-colors group-hover:border-au-gold max-md:hidden">
                  {room.name}
                </span>
              </button>
            ))}
          </div>
          <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-au-mute">
            <span>Planta ilustrada da Residência A · 127 m² · 3 suítes</span>
            <span className="text-[10px] tracking-[0.2em] uppercase">Imagem ilustrativa</span>
          </figcaption>
          <ol className="mt-6 grid grid-cols-2 gap-2 md:hidden">
            {AURORA_ROOMS.map((room, i) => (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="flex w-full items-center gap-3 border border-au-line px-3 py-3 text-left text-[12.5px] transition-colors hover:border-au-gold"
                >
                  <span className="text-[11px] font-bold text-au-gold tabular-nums">{i + 1}</span>
                  {room.name}
                </button>
              </li>
            ))}
          </ol>
        </figure>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
          {SPECS.map((spec) => (
            <article key={spec.id} className="border border-au-line bg-au-bg/60 p-6">
              <AuroraEyebrow>{spec.face}</AuroraEyebrow>
              <h3 className="mt-4 flex items-baseline justify-between gap-4 font-aurora text-[28px] leading-none font-light">
                {spec.name}
                <span className="text-[15px] text-au-mute">{spec.area} m²</span>
              </h3>
              <dl className="mt-5 grid gap-2.5 border-t border-au-line pt-4 text-[13px]">
                {spec.rows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-au-mute">{label}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 flex items-baseline justify-between border-t border-au-line pt-4">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-au-mute uppercase">A partir de</span>
                <span className="font-aurora text-[22px] tabular-nums">{brl(spec.from)}</span>
              </p>
            </article>
          ))}
        </div>
      </div>

      <Lightbox index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </SiteSection>
  );
}

function Lightbox({ index, onClose, onIndex }: { index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<Element | null>(null);
  const open = index !== null;
  const room = open ? AURORA_ROOMS[index] : null;
  const count = AURORA_ROOMS.length;

  useEffect(() => {
    if (!open) return;
    returnRef.current = document.activeElement;
    closeRef.current?.focus();
    lenisRef.current?.stop();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      lenisRef.current?.start();
      document.documentElement.style.overflow = overflow;
      (returnRef.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!room || index === null) return null;
  const step = (d: number) => onIndex((index + d + count) % count);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={room.name}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
        if (event.key === "Tab") {
          // aria-modal: keep keyboard focus inside the lightbox
          const items = event.currentTarget.querySelectorAll<HTMLElement>("button");
          const first = items[0];
          const last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      className="fixed inset-0 z-[80] flex flex-col bg-au-bg/96 backdrop-blur-xl transition-opacity duration-500 starting:opacity-0"
    >
      <div className="flex items-center justify-between gap-4 px-[var(--pad)] py-4">
        <AuroraEyebrow>
          Ambiente {index + 1} de {count}
        </AuroraEyebrow>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex items-center gap-3 border border-au-line px-4 py-2.5 text-[10px] leading-none font-bold tracking-[0.22em] uppercase transition-colors hover:border-au-gold focus-visible:outline-au-gold"
        >
          Fechar <span aria-hidden>✕</span>
        </button>
      </div>
      <div className="relative min-h-0 flex-1" onClick={onClose}>
        <Image
          key={room.id}
          src={room.image.src}
          alt={room.image.alt}
          fill
          sizes="100vw"
          className="object-contain px-[var(--pad)] transition-opacity duration-700 starting:opacity-0"
        />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-5 px-[var(--pad)] pt-5 pb-7">
        <div>
          <p className="font-aurora text-[clamp(26px,3vw,38px)] leading-none font-light">{room.name}</p>
          <p className="mt-2 text-[13.5px] text-au-mute">{room.note}</p>
        </div>
        <div className="flex gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => step(d)}
              aria-label={d < 0 ? "Ambiente anterior" : "Próximo ambiente"}
              className={cn(
                "grid h-12 w-12 place-items-center border border-au-line text-[16px] transition-colors hover:border-au-gold hover:text-au-gold focus-visible:outline-au-gold",
              )}
            >
              <span aria-hidden>{d < 0 ? "←" : "→"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
