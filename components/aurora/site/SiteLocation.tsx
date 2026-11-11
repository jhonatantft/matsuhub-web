"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AURORA, AURORA_MEDIA, AURORA_PLACES } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { SECTION } from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

/**
 * Localização: the aerial view with pins that drop in one by one when the map scrolls into
 * view, and the travel times beside it. The pins live in a 16:9 box the size of the image, so
 * they stay on their spot when phones crop the picture (only its left three quarters show).
 */
export function SiteLocation() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [hot, setHot] = useState<string | null>(null);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <SiteSection id={SECTION.location} className="bg-au-bg-2/60">
      <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:items-end">
        <SiteHeading
          eyebrow="Localização"
          title="Pé na areia. O resto, a minutos."
          lead={`${AURORA.location}: na quadra da praia, perto da marina, do centro gastronômico e do parque.`}
        />
      </div>

      <div ref={mapRef} className="relative mt-12 aspect-[4/3] overflow-hidden border border-au-line md:aspect-video">
        <div className="absolute inset-y-0 left-0 aspect-video h-full">
          <Image
            src={AURORA_MEDIA.aerial.src}
            alt={AURORA_MEDIA.aerial.alt}
            fill
            sizes="(min-width: 1400px) 1320px, (min-width: 768px) 95vw, 140vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-au-bg/25" />
          {AURORA_PLACES.map((place, i) => {
            const main = "main" in place && place.main;
            return (
              <div
                key={place.name}
                data-seen={seen}
                data-hot={hot === place.name}
                className="group absolute z-[1] -translate-x-1/2 -translate-y-full transition-[opacity,translate] duration-700 ease-soft data-[hot=true]:z-[2] data-[seen=false]:-translate-y-[calc(100%+18px)] data-[seen=false]:opacity-0"
                style={{ left: `${place.x * 100}%`, top: `${place.y * 100}%`, transitionDelay: seen ? `${0.15 + i * 0.14}s` : "0s" }}
              >
                <span
                  className={cn(
                    "mb-2 flex items-center gap-2 border px-2.5 py-1.5 text-[10px] leading-none whitespace-nowrap backdrop-blur-md transition-colors duration-300 max-sm:px-2 max-sm:text-[9px]",
                    main
                      ? "border-au-gold bg-au-gold font-semibold text-au-bg"
                      : "border-au-line bg-au-bg/80 text-au-ink group-data-[hot=true]:border-au-gold",
                  )}
                >
                  {main ? AURORA.short : place.name}
                  <span className={main ? "text-au-bg/70" : "text-au-gold"}>{place.time}</span>
                </span>
                <span className="relative mx-auto block h-3 w-3">
                  {main && <i aria-hidden className="absolute -inset-2 animate-ping rounded-full bg-au-gold/40 [animation-duration:2.4s]" />}
                  <i aria-hidden className="absolute inset-0 rounded-full border-2 border-au-bg bg-au-gold shadow-[0_0_14px_var(--color-au-gold)]" />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ol className="mt-8 grid gap-px border border-au-line bg-au-line sm:grid-cols-2 lg:grid-cols-4">
        {AURORA_PLACES.filter((p) => !("main" in p)).map((place) => (
          <li
            key={place.name}
            onPointerEnter={() => setHot(place.name)}
            onPointerLeave={() => setHot(null)}
            className="flex items-baseline justify-between gap-4 bg-au-bg px-5 py-5"
          >
            <span className="text-[14px]">{place.name}</span>
            <span className="font-aurora text-[22px] leading-none text-au-gold">{place.time}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11.5px] text-au-mute">Tempos aproximados a pé (praia) e de carro. Endereço e vista aérea ilustrativos.</p>
    </SiteSection>
  );
}
