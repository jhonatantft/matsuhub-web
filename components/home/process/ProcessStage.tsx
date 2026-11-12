"use client";

import { useEffect, useRef, useState } from "react";
import { PROCESS } from "@/content/site";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp } from "@/lib/math";
import { dict, t as tr, type Lang } from "@/lib/i18n";
import { onFrame } from "@/lib/ticker";
import { Build } from "./scenes/Build";
import { Discovery } from "./scenes/Discovery";
import { Evolve } from "./scenes/Evolve";
import { Prototype } from "./scenes/Prototype";
import { DUR, locate } from "./timeline";

type Mode = "idle" | "auto" | "static";

const SCENES = [Discovery, Prototype, Build, Evolve] as const;

const CSS = `
@keyframes pr-in{from{opacity:0;transform:scale(.985)}}
@keyframes pr-tick{from{opacity:0;transform:translateY(45%)}}
.pr-scene{animation:pr-in .55s var(--ease-soft) both}
.pr-tick{animation:pr-tick .45s var(--ease-soft) both}
.pr-panel{transition:opacity .45s var(--ease-soft),translate .45s var(--ease-soft),visibility 0s linear .45s}
.pr-panel[data-on="true"]{transition:opacity .5s var(--ease-soft) .08s,translate .5s var(--ease-soft) .08s,visibility 0s}
.pr-panel[data-on="false"]{opacity:0;translate:0 8px;visibility:hidden}
@media (prefers-reduced-motion:reduce){.pr-scene,.pr-tick{animation:none}.pr-panel,.pr-panel[data-on="true"]{transition:none}}
`;

function LoopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 8a5 5 0 1 1-1.5-3.6M13 3v2.6h-2.6" />
    </svg>
  );
}

const BLOCK_ICONS = {
  happens: <path d="M3 8h2.5l1.5-4 2 8 1.5-4H13" />,
  you: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3.5 13.5a4.5 4.5 0 0 1 9 0" />
    </>
  ),
  get: (
    <>
      <path d="M2.5 5.5 8 2.5l5.5 3v5L8 13.5l-5.5-3Z" />
      <path d="M2.5 5.5 8 8.5l5.5-3M8 8.5v5" />
    </>
  ),
};

function Block({ icon, label, children }: { icon: keyof typeof BLOCK_ICONS; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
      <span className="mt-[1px] grid h-[22px] w-[22px] place-items-center rounded-[7px] border border-line-2 text-acc">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {BLOCK_ICONS[icon]}
        </svg>
      </span>
      <div>
        <h4 className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{label}</h4>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

/** The process as a project played start to finish on a stage, with the four phases as tabs. */
export function ProcessStage({ lang = "pt" }: { lang?: Lang }) {
  const d = dict(lang).process;
  const [phase, setPhase] = useState(0);
  const [t, setT] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [paused, setPaused] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const pausedRef = useRef(false);
  const phaseRef = useRef(0);
  const elRef = useRef(0);
  const configured = useRef(false);
  const reducedRef = useRef(false);

  /* Start when scrolled into view; configure reduced motion and lab overrides on the first callback. */
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (!configured.current) {
          configured.current = true;
          reducedRef.current = reducedMotion();
          // Lab: ?t=N freezes the stage at N s of the full loop (and ?pt=S sets the moment shown after a tab click).
          const forced = labParam("t");
          if (forced !== null || reducedRef.current) {
            const at = forced !== null ? locate(forced) : { phase: 0, t: DUR[0] };
            phaseRef.current = at.phase;
            elRef.current = at.t;
            setPhase(at.phase);
            setT(at.t);
            setMode("static");
            return;
          }
        }
        if (entry.isIntersecting) setMode((m) => (m === "idle" ? "auto" : m));
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* Autoplay: advances only while on screen, the tab is visible and the visitor has not paused it. */
  useEffect(() => {
    if (mode !== "auto") return;
    return onFrame((_time, dt) => {
      if (!visibleRef.current || document.hidden || pausedRef.current) return;
      let ph = phaseRef.current;
      let el = elRef.current + dt;
      if (el >= DUR[ph]) {
        if (hoverRef.current || focusRef.current) el = DUR[ph];
        else {
          ph = (ph + 1) % DUR.length;
          el = 0;
          phaseRef.current = ph;
          setPhase(ph);
        }
      }
      elRef.current = el;
      setT(Math.round(el * 30) / 30);
    });
  }, [mode]);

  const select = (i: number) => {
    phaseRef.current = i;
    let el = 0;
    if (mode === "static") el = reducedRef.current ? DUR[i] : clamp(labParam("pt") ?? DUR[i], 0, DUR[i]);
    elRef.current = el;
    setPhase(i);
    setT(el);
  };

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = PROCESS.phases.length;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next);
    document.getElementById(`pr-tab-${next}`)?.focus();
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const Scene = SCENES[phase];
  const progress = clamp(t / DUR[phase]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hoverRef.current = true;
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
      onFocus={() => {
        focusRef.current = true;
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focusRef.current = false;
      }}
    >
      <style href="pr-stage" precedence="default">
        {CSS}
      </style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-[10%] lg:-inset-x-[8%] bottom-[-10%] bg-[radial-gradient(45%_45%_at_30%_55%,rgb(185_255_75/0.1),transparent_70%),radial-gradient(40%_40%_at_78%_45%,rgb(62_242_196/0.08),transparent_70%)]"
      />

      <div className="relative overflow-hidden rounded-[26px] border border-line bg-[linear-gradient(180deg,rgb(14_22_18/0.92),rgb(6_10_8/0.94))] shadow-[0_40px_120px_-60px_rgb(185_255_75/0.5),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(185_255_75/0.7),rgb(62_242_196/0.5),transparent)]"
        />

        {/* ── header ── */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
          <p className="flex min-w-0 flex-1 items-center gap-2.5 font-mono text-[11px] tracking-[0.08em] text-mute uppercase">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                mode === "auto" && !paused ? "animate-blink bg-acc shadow-[0_0_10px_var(--color-acc)]" : "bg-acc-2 shadow-[0_0_10px_var(--color-acc-2)]",
              )}
            />
            <span className="truncate">
              {d.sample}<span className="hidden sm:inline"> · <span className="text-ink">{d.sampleKind}</span></span>
            </span>
          </p>
          <span className="chip shrink-0 border-warm/30 text-warm">{d.illustrative}</span>
          {mode !== "static" && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={paused ? d.resume : d.pause}
              aria-pressed={paused}
              className="relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-line-2 text-mute transition-colors duration-300 before:absolute before:-inset-[5px] before:content-[''] hover:border-acc hover:text-acc"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                {paused ? <path d="M5 3.5v9l7.5-4.5Z" /> : <path d="M4.5 3.5h2.4v9H4.5Zm4.6 0h2.4v9H9.1Z" />}
              </svg>
            </button>
          )}
        </div>

        {/* ── the shape of the process, above the tabs (desktop) ── */}
        <div aria-hidden className="hidden grid-cols-[1fr_1fr_1.55fr_1fr] border-b border-line font-mono text-[10px] tracking-[0.14em] uppercase lg:grid">
          <p className="col-span-2 flex items-center gap-3 px-6 py-2.5 text-dim">
            {d.wayIn}
            <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--color-line-2),transparent)]" />→
          </p>
          <p className="flex items-center gap-2 border-l border-line px-6 py-2.5 text-acc">
            <LoopIcon className="h-3.5 w-3.5 motion-safe:animate-spin-slow" />
            {d.loop}
          </p>
          <p className="flex items-center gap-3 border-l border-line px-6 py-2.5 text-acc-2">
            {d.after}
            <span className="h-px flex-1 bg-[linear-gradient(90deg,rgb(62_242_196/0.5),transparent)]" />∞
          </p>
        </div>

        {/* ── phases as tabs ── */}
        <div role="tablist" aria-label={d.phases} className="grid grid-cols-2 border-b border-line lg:grid-cols-[1fr_1fr_1.55fr_1fr]">
          {PROCESS.phases.map((p, i) => {
            const sel = i === phase;
            const loop = i === 2;
            return (
              <button
                key={p.n}
                id={`pr-tab-${i}`}
                data-phase={i}
                type="button"
                role="tab"
                aria-selected={sel}
                aria-controls={`pr-panel-${i}`}
                tabIndex={sel ? 0 : -1}
                onClick={() => select(i)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cn(
                  "group relative cursor-pointer px-4 pt-3 pb-3.5 text-left transition-colors duration-300 focus-visible:z-10 focus-visible:outline-offset-[-3px] sm:px-6 lg:pt-4 lg:pb-5",
                  i % 2 === 1 && "border-l border-line",
                  i >= 2 && "border-t border-line lg:border-t-0",
                  i === 2 && "lg:border-l",
                  sel ? "bg-[linear-gradient(180deg,rgb(185_255_75/0.09),rgb(185_255_75/0.02))]" : "hover:bg-white/[0.025]",
                )}
              >
                <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em]">
                  <span className={sel ? "text-acc" : "text-dim"}>{p.n}</span>
                  {loop && (
                    <span className={cn("flex items-center gap-1 rounded-full border px-1.5 py-px text-[9.5px] tracking-[0.08em] uppercase", sel ? "border-acc/50 text-acc" : "border-line-2 text-mute")}>
                      <LoopIcon className={cn("h-2.5 w-2.5", sel && "motion-safe:animate-spin-slow")} />
                      {d.cycle}
                    </span>
                  )}
                </span>
                <span className={cn("mt-1.5 block font-display text-[15px] font-semibold tracking-[-0.02em] sm:text-[17px]", sel ? "text-ink" : "text-ink/70 group-hover:text-ink")}>
                  {tr(p.title, lang)}
                </span>
                <span className="mt-1 block truncate font-mono text-[10.5px] text-mute">
                  <span className="lg:hidden">{tr(p.short, lang)}</span>
                  <span className="hidden lg:inline">{tr(p.caption, lang)}</span>
                </span>
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.04]">
                  <span
                    className="absolute inset-0 origin-left bg-[linear-gradient(90deg,var(--color-acc),var(--color-acc-2))] shadow-[0_0_10px_rgb(185_255_75/0.7)]"
                    style={{ transform: `scaleX(${sel ? progress : i < phase ? 1 : 0})`, opacity: sel ? 1 : 0.35 }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* ── body: illustration + what it means ── */}
        <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="relative h-[360px] overflow-hidden border-b border-line bg-[radial-gradient(70%_80%_at_50%_45%,rgb(62_242_196/0.06),transparent_70%)] sm:h-[420px] lg:h-[480px] lg:border-r lg:border-b-0">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)]"
            />
            <div key={phase} className="pr-scene absolute inset-0">
              <Scene t={t} lang={lang} />
            </div>
          </div>

          <div className="grid">
            {PROCESS.phases.map((p, i) => {
              const on = i === phase;
              return (
                <div
                  key={p.n}
                  id={`pr-panel-${i}`}
                  role="tabpanel"
                  aria-labelledby={`pr-tab-${i}`}
                  data-on={on}
                  inert={!on}
                  className="pr-panel flex flex-col gap-5 px-5 py-6 [grid-area:1/1] sm:px-8 sm:py-8 lg:gap-6"
                >
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.16em] text-acc">{p.n} / 04</p>
                    <h3 className="mt-2 font-display text-[clamp(22px,2.2vw,28px)] font-semibold tracking-[-0.02em]">{tr(p.title, lang)}</h3>
                  </div>
                  <Block icon="happens" label={d.happens}>
                    <p className="text-[15px] leading-relaxed text-ink/85">{tr(p.happens, lang)}</p>
                  </Block>
                  <Block icon="you" label={d.you}>
                    <p className="text-[15px] leading-relaxed text-ink/85">{tr(p.you, lang)}</p>
                  </Block>
                  <Block icon="get" label={d.get}>
                    <ul className="flex flex-wrap gap-1.5">
                      {tr(p.get, lang).map((g) => (
                        <li key={g} className="chip border-acc/30 text-ink">
                          <span aria-hidden className="text-acc">
                            ↳
                          </span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </Block>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
