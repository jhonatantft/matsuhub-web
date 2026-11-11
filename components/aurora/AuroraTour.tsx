"use client";

import { AURORA_FEATURED, type AuroraUnit } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { AuroraStage } from "./AuroraStage";
import { AuroraTourHint, AuroraTourLayer } from "./AuroraTourLayer";
import { useAuroraTour } from "./useAuroraTour";
import type { AuroraView } from "./views";

export type AuroraTourProps = {
  /** Floor selected on arrival. Default: the featured residence's (18). */
  floor?: number;
  /** Start by day or at blue hour (the visitor can switch). */
  time?: "day" | "dusk";
  /** Server-render the first picture under the canvas — use it when the tour is the page's hero. */
  poster?: boolean;
  /** Fired whenever the visitor lands on another picture. */
  onViewChange?: (view: AuroraView, unit: AuroraUnit) => void;
  /** Size the box here (e.g. "h-svh"); the tour fills it. */
  className?: string;
  /** Let the filmed moves play where they match the click (plan → living, living ⇄ suite). Default false. */
  flourish?: boolean;
  /** Extra overlays drawn above the picture (a header, a caption…). */
  children?: React.ReactNode;
};

/**
 * The interactive Aurora tour, ready to drop on a page — the visitor drives it (useAuroraTour):
 * hover lights a floor and its card follows; click (tap, Enter) flies the camera into that floor;
 * "Ver residência" or a second click dissolves into the plan from there; a hotspot flies into its
 * room and dissolves into the photo; back retraces each step. Keyboard: arrows browse floors (or
 * rooms on the plan), Enter opens, Esc goes back. Touch: tap does what a click does.
 */
export function AuroraTour({
  floor: initialFloor = AURORA_FEATURED.floor,
  time: initialTime = "dusk",
  poster = false,
  onViewChange,
  flourish = false,
  className,
  children,
}: AuroraTourProps) {
  const tour = useAuroraTour({ floor: initialFloor, time: initialTime, flourish, top: 64, onViewChange });
  const { mode, time, wide, flying, rootRef, actions } = tour;
  const outside = (mode === "tower" || mode === "floor") && !flying;

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      aria-label="Tour pelo Aurora Residence: setas escolhem o andar, Enter entra, Esc volta"
      onKeyDown={tour.onKeyDown}
      className={cn(
        "@container relative isolate overflow-hidden bg-au-bg text-au-ink outline-none focus-visible:ring-1 focus-visible:ring-au-gold/60 focus-visible:ring-inset",
        className,
      )}
    >
      <AuroraStage
        {...tour.stageProps}
        interactive
        poster={poster}
        initial={{ view: initialTime, floor: initialFloor }}
        padding={{ plan: { top: 72, bottom: wide ? 112 : 136 } }}
        onResize={tour.resized}
        onFrame={tour.frame}
      >
        <AuroraTourLayer tour={tour} />
        <div
          data-open={outside}
          inert={!outside}
          className="absolute z-[3] flex items-center gap-3 transition-opacity duration-500 data-[open=false]:opacity-0 @max-xl:top-[72px] @max-xl:right-3 @xl:bottom-6 @xl:left-6"
        >
          <div
            role="group"
            aria-label="Horário"
            className="flex border border-au-line bg-au-bg/70 p-[3px] text-[9.5px] leading-none font-bold tracking-[0.2em] uppercase backdrop-blur-md"
          >
            {(["day", "dusk"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={time === option}
                onClick={() => actions.setTime(option)}
                className="px-3 py-2 text-au-ink transition-colors hover:text-au-gold focus-visible:outline-au-gold aria-pressed:bg-au-ink aria-pressed:text-au-bg"
              >
                {option === "day" ? "Dia" : "Noite"}
              </button>
            ))}
          </div>
          <AuroraTourHint tour={tour} className="@max-xl:hidden" />
        </div>
        {children}
      </AuroraStage>
    </section>
  );
}
