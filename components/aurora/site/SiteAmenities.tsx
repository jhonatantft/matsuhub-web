"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { AURORA_AMENITIES } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { isOnScreen, viewProgress } from "@/lib/scroll";
import { onFrame } from "@/lib/ticker";
import { Reveal } from "@/components/ui/Reveal";
import { SECTION } from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

/**
 * Lazer: the amenities as big photographs. Each picture drifts a few percent against the
 * scroll (gentle parallax, none under reduced motion).
 */
export function SiteAmenities() {
  const frames = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (reducedMotion()) return;
    return onFrame(() => {
      for (const el of frames.current) {
        if (!el || !isOnScreen(el, 80)) continue;
        const p = viewProgress(el.parentElement ?? el);
        el.style.transform = `translate3d(0,${((p - 0.5) * -9).toFixed(3)}%,0)`;
      }
    });
  }, []);

  return (
    <SiteSection id={SECTION.leisure}>
      <SiteHeading
        eyebrow="Lazer"
        title="O resort começa no elevador."
        lead="Rooftop com piscina de borda infinita, lobby de pé-direito duplo e varandas gourmet em todas as residências."
      />
      <ul className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
        {AURORA_AMENITIES.map((item, i) => {
          const hero = i === 0;
          return (
            <Reveal
              as="li"
              key={item.id}
              delay={hero ? 0 : (i - 1) * 0.12}
              className={cn("group relative overflow-hidden border border-au-line", hero ? "md:col-span-2" : "")}
            >
              <div className={cn("relative overflow-hidden", hero ? "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]" : "aspect-[4/5] lg:aspect-[5/4]")}>
                <div
                  ref={(el) => {
                    frames.current[i] = el;
                  }}
                  className="absolute -inset-y-[7%] inset-x-0 will-change-transform"
                >
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes={hero ? "(min-width: 1400px) 1320px, 100vw" : "(min-width: 768px) 50vw, 100vw"}
                    className="object-cover transition-transform duration-[1.6s] ease-soft group-hover:scale-[1.03]"
                  />
                </div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-au-bg/90 via-au-bg/20 to-transparent" />
                <div className={cn("absolute inset-x-0 bottom-0 p-6", hero ? "md:p-10" : "md:p-8")}>
                  <span className="text-[10px] font-semibold tracking-[0.26em] text-au-gold uppercase tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className={cn(
                      "mt-3 font-aurora leading-[1.05] font-light",
                      hero ? "text-[clamp(28px,3.4vw,46px)]" : "text-[clamp(24px,2.4vw,32px)]",
                    )}
                  >
                    {item.name}
                  </h3>
                  <p className="mt-3 max-w-[440px] text-[14px] leading-relaxed text-au-ink/80">{item.text}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </SiteSection>
  );
}
