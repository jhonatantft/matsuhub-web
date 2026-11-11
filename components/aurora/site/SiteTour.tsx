"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_BAR_H } from "@/components/demo/constants";
import { AURORA, AURORA_FEATURED } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { AuroraEyebrow } from "../AuroraChrome";
import { AuroraStage } from "../AuroraStage";
import { AuroraTourHint, AuroraTourLayer } from "../AuroraTourLayer";
import { useAuroraTour } from "../useAuroraTour";
import { emitSite, onSite } from "./bus";

/** Space taken by MatsuHub's demo bar and the Aurora header (56–60) above the picture. */
const TOP = DEMO_BAR_H + 64;

/**
 * The page's hero: the interactive Aurora tour (useAuroraTour — the same behaviour as
 * components/aurora/AuroraTour: hover a floor, click to fly into it, open the plan, fly into a
 * room) plus what a landing page needs on top of it — the title, tagline and facts, a hint, and
 * a way for the rest of the page to point at a residence (`onSite("unit")`: the explorer and Lia
 * select a unit and the facade highlights its floor).
 */
export function SiteTour() {
  const [width, setWidth] = useState(1440);
  /** Phones: the intro stays until the visitor touches the tower, then the floor card takes over. */
  const [touched, setTouched] = useState(false);
  const [flash, setFlash] = useState(0);

  const tour = useAuroraTour({
    floor: AURORA_FEATURED.floor,
    time: "dusk",
    top: TOP + 16,
    onMode: (next) => emitSite("tour", next === "floor" ? "tower" : next),
  });
  const { mode, time, rootRef, actions } = tour;

  const wide = width >= 576;
  const large = width >= 1200;
  /** Tablets and small laptops: the intro sits low, under the floor card, and yields on the first hover. */
  const medium = wide && !large;
  const showIntro = mode === "tower" && (large || !touched);
  const outside = mode === "tower" || mode === "floor";

  // a unit picked elsewhere on the page (explorer, Lia)
  const showRef = useRef(actions.show);
  useEffect(() => {
    showRef.current = actions.show;
  });
  useEffect(
    () =>
      onSite("unit", (next) => {
        showRef.current(next.floor, next.type);
        setTouched(true);
        setFlash((n) => n + 1);
      }),
    [],
  );

  return (
    <section
      id="top"
      ref={rootRef}
      tabIndex={0}
      aria-label="Tour pelo Aurora Residence: setas escolhem o andar, Enter entra, Esc volta"
      onKeyDown={tour.onKeyDown}
      className="@container relative isolate h-svh min-h-[560px] overflow-hidden bg-au-bg text-au-ink outline-none"
    >
      <AuroraStage
        {...tour.stageProps}
        interactive
        poster
        initial={{ view: "dusk", floor: AURORA_FEATURED.floor }}
        padding={{ plan: { top: TOP, bottom: wide ? 112 : 136 } }}
        onResize={(w) => {
          setWidth(w);
          tour.resized(w);
        }}
        onFloorHover={(hovered) => {
          if (hovered !== null && hovered !== tour.floor && mode === "tower") setTouched(true);
          tour.stageProps.onFloorHover(hovered);
        }}
        onFloorSelect={(picked) => {
          setTouched(true);
          tour.stageProps.onFloorSelect(picked);
        }}
        onFrame={tour.frame}
      >
        {/* soft shade where the text sits */}
        <div
          aria-hidden
          data-open={showIntro}
          className={cn(
            "pointer-events-none absolute inset-0 z-[2] transition-opacity duration-700 data-[open=false]:opacity-0",
            large
              ? "bg-[linear-gradient(90deg,rgb(7_11_26/0.78)_0%,rgb(7_11_26/0.45)_24%,transparent_38%)]"
              : medium
                ? "bg-[linear-gradient(0deg,rgb(7_11_26/0.94)_0%,rgb(7_11_26/0.7)_30%,transparent_58%)]"
                : "bg-[linear-gradient(180deg,rgb(7_11_26/0.92)_0%,rgb(7_11_26/0.7)_42%,transparent_62%)]",
          )}
        />

        {/* intro: name, tagline, facts */}
        <div
          data-open={showIntro}
          inert={!showIntro}
          className={cn(
            "absolute z-[3] transition-[opacity,translate] duration-700 ease-soft data-[open=false]:pointer-events-none data-[open=false]:-translate-y-2 data-[open=false]:opacity-0",
            large
              ? "top-1/2 left-[var(--pad)] w-[min(330px,calc(50%-280px))] -translate-y-1/2 data-[open=false]:-translate-y-[calc(50%+8px)]"
              : medium
                ? "inset-x-0 bottom-[88px] px-[var(--pad)]"
                : "inset-x-0 top-[calc(var(--top)+18px)] px-[var(--pad)]",
          )}
          style={{ "--top": `${TOP}px` } as React.CSSProperties}
        >
          <AuroraEyebrow className="starting:opacity-0 transition-opacity duration-1000">{AURORA.location}</AuroraEyebrow>
          <h1
            className={cn(
              "mt-4 font-aurora leading-[0.94] font-light tracking-[-0.015em] text-au-ink [text-shadow:0_2px_30px_rgb(0_0_0/0.45)]",
              large ? "text-[60px]" : medium ? "text-[clamp(44px,5.4vw,60px)]" : "text-[clamp(40px,9vw,64px)]",
            )}
          >
            Aurora
            <br className={medium ? "hidden" : undefined} /> Residence
          </h1>
          <i aria-hidden className={cn("mt-6 block h-px w-12 bg-au-gold", medium && "hidden")} />
          <p className={cn("mt-5 text-au-ink/90", large ? "text-[17px] leading-snug" : "max-w-[300px] text-[15px] leading-snug")}>
            {AURORA.tagline}
          </p>
          <p className="mt-2 text-[12px] text-au-mute">{AURORA.delivery}</p>
          <dl
            className={cn(
              "grid grid-cols-2 border-t border-au-line",
              large
                ? "mt-9 gap-x-6 gap-y-5 pt-6"
                : medium
                  ? "mt-6 max-w-[min(720px,calc(100%-210px))] grid-cols-4 gap-x-6 pt-4"
                  : "mt-6 max-w-[420px] gap-x-5 gap-y-3.5 pt-4",
            )}
          >
            {AURORA.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="sr-only">{fact.label}</dt>
                <dd className={cn("font-aurora leading-none text-au-ink", large ? "text-[26px]" : "text-[21px]")}>{fact.value}</dd>
                <dd className="mt-1.5 text-[9.5px] leading-snug font-semibold tracking-[0.18em] text-au-mute uppercase">{fact.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* tower and floor: card + leader, plan hotspots, room bar */}
        <AuroraTourLayer
          key={flash}
          tour={tour}
          card={wide || touched}
          cardClassName={flash ? "[&>div]:animate-[au-flash_1.2s_ease-out]" : undefined}
        />
        <div
          data-open={outside}
          inert={!outside}
          className={cn(
            "absolute z-[4] flex items-center gap-3 transition-opacity duration-500 data-[open=false]:pointer-events-none data-[open=false]:opacity-0",
            wide ? "bottom-6 left-[var(--pad)]" : "right-3",
          )}
          style={wide ? undefined : { top: TOP + 14 }}
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
                className="relative px-3 py-2 text-au-ink transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:text-au-gold focus-visible:outline-au-gold aria-pressed:bg-au-ink aria-pressed:text-au-bg"
              >
                {option === "day" ? "Dia" : "Noite"}
              </button>
            ))}
          </div>
          {wide && <AuroraTourHint tour={tour} />}
        </div>
        {!wide && (
          <div
            data-open={mode === "tower" && !touched}
            className="pointer-events-none absolute inset-x-0 bottom-7 z-[4] flex justify-center transition-opacity duration-500 data-[open=false]:opacity-0"
          >
            <span className="border border-au-line bg-au-bg/75 px-4 py-3 backdrop-blur-md">
              <AuroraTourHint tour={tour} />
            </span>
          </div>
        )}
      </AuroraStage>
      <style>{`@keyframes au-flash{0%{box-shadow:0 0 0 1px var(--color-au-gold),0 0 40px 4px rgb(231 197 138/.45)}100%{box-shadow:0 0 0 1px transparent,0 0 0 0 transparent}}`}</style>
    </section>
  );
}
