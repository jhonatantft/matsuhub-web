"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AURORA, AURORA_SHOWCASE_STEPS, AURORA_SHOWCASE_STEPS_EN } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { clamp, damp, lerp, seg, smoothstep } from "@/lib/math";
import { lenisRef, pinProgress } from "@/lib/scroll";
import { AuroraChat } from "../AuroraChat";
import { AuroraEyebrow, AuroraTopBar } from "../AuroraChrome";
import { AuroraStage, type AuroraStageHandle } from "../AuroraStage";
import { AuroraTourHint, AuroraTourLayer } from "../AuroraTourLayer";
import { useAuroraTour } from "../useAuroraTour";
import { FACADE, isExterior, type AuroraView } from "../views";

/**
 * The homepage's pinned scene: a "browser window" showing the Aurora demo while MatsuHub
 * comments on it from outside.
 *
 * Scroll tells only the intro — the blueprint, the scan line building the tower, blue hour.
 * From LIVE on, the window *is* the interactive tour (useAuroraTour): the visitor hovers the
 * floors, clicks one and the camera flies into it, opens the plan, flies into the rooms, asks
 * Lia. Nothing is scripted after that point; scrolling back into the intro resets it.
 */

const STEPS_PT = AURORA_SHOWCASE_STEPS;
const COUNT = STEPS_PT.length;
const FEATURED = 18;
const LIVE = STEPS_PT[COUNT - 1].at;

/** MatsuHub's own words around the window. The Aurora site inside it stays Portuguese, like the demo. */
const COPY = {
  pt: {
    steps: STEPS_PT,
    openFull: "Abrir o site completo",
    openDemo: "Abrir o site-demo",
    tag: "site-demo · imobiliária",
    regionLive: "Site-demo Aurora Residence, interativo: escolha um andar, abra a planta e os ambientes.",
    regionIntro: "Demonstração do site-demo Aurora Residence: do projeto ao prédio pronto, ao anoitecer.",
    keys: "Tour: setas escolhem o andar, Enter entra, Esc volta",
    building: "construindo",
  },
  en: {
    steps: AURORA_SHOWCASE_STEPS_EN,
    openFull: "Open the full site",
    openDemo: "Open the demo site",
    tag: "demo site · real estate",
    regionLive: "Aurora Residence demo site, interactive: pick a floor, open the plan and the rooms. The demo itself is in Portuguese.",
    regionIntro: "Aurora Residence demo site: from the drawing to the finished tower, at nightfall. The demo itself is in Portuguese.",
    keys: "Tour: arrow keys pick a floor, Enter goes in, Esc goes back",
    building: "building",
  },
} as const;

/** Beats of the scroll intro (0..1 of the pinned timeline). */
const T = {
  build: [0.13, 0.42],
  dusk: [0.5, 0.7],
} as const;

const PRELOAD: readonly AuroraView[] = ["blueprint", "day", "dusk", "plan", "living", "suite", "bath", "varanda"];

/** Notes pinned to the drawing while it is still a blueprint. `side`: 1 = text to the right. */
const CALLOUTS = [
  { x: FACADE.right, y: 0.093, side: 1, text: "Rooftop · borda infinita" },
  { x: FACADE.left, y: 0.255, side: -1, text: "21 pavimentos" },
  { x: FACADE.right, y: 0.445, side: 1, text: "Varandas gourmet" },
  { x: FACADE.left, y: 0.62, side: -1, text: "42 residências" },
] as const;

type Ui = { step: number; chrome: boolean; hero: boolean; live: boolean };
const UI_START: Ui = { step: 0, chrome: false, hero: false, live: false };
const sameUi = (a: Ui, b: Ui) => a.step === b.step && a.chrome === b.chrome && a.hero === b.hero && a.live === b.live;

/** Progress bars start empty; the frame loop owns their transform from then on. */
const EMPTY = { transform: "scaleX(0)" } as const;

export function ShowcaseScene({ lang = "pt" }: { lang?: "pt" | "en" }) {
  const copy = COPY[lang];
  const STEPS = copy.steps;
  const [ui, setUi] = useState<Ui>(UI_START);
  const [wide, setWide] = useState(true);
  const [chat, setChat] = useState(false);

  const tour = useAuroraTour({ floor: FEATURED, time: "dusk", top: 56 });
  const { mode, actions, rootRef } = tour;

  const pinRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const tagTextRef = useRef<HTMLSpanElement>(null);
  const footRef = useRef<HTMLParagraphElement>(null);
  const calloutRefs = useRef<(HTMLElement | null)[]>([]);
  const limeRef = useRef<HTMLDivElement>(null);
  const goldRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLElement | null)[]>([]);

  /** Everything the frame loop remembers between frames (never read while rendering). */
  const mem = useRef({
    synced: false,
    live: false,
    p: 0,
    ui: UI_START,
    next: { ...UI_START },
    patch: {
      build: 0,
      dusk: 0,
      floor: null as number | null,
      zoom: 1,
      focus: { x: 0.5, y: 0.5 },
      pan: { x: 0, y: 0 },
      aim: 0,
    },
    a: { x: 0, y: 0 },
    hud: -1,
    pct: -1,
    lime: -1,
    gold: -1,
    fill: new Array<number>(COUNT * 2).fill(-1),
  });

  const frame = (stage: AuroraStageHandle, time: number, dt: number) => {
    const pin = pinRef.current;
    const m = mem.current;
    const height = stage.size.height;
    if (!pin || stage.size.width < 2) return;

    const raw = pinProgress(pin);
    m.p = m.synced ? damp(m.p, raw, 9, dt) : raw;
    if (Math.abs(m.p - raw) < 0.00004) m.p = raw;
    const p = m.p;
    const live = p >= LIVE;
    const build = live ? 1 : smoothstep(seg(p, T.build[0], T.build[1]));
    const dusk = live ? 1 : smoothstep(seg(p, T.dusk[0], T.dusk[1]));
    const view = stage.state.view;
    const outside = isExterior(view);

    if (live) {
      /* the visitor drives: the tour takes the stage over from the camera the intro left */
      if (!m.live || !m.synced) {
        m.live = true;
        if (!m.synced || !outside) stage.set({ view: "dusk" });
        stage.set({ build: 1, dusk: 1 });
        m.synced = true;
        actions.adopt();
      }
      tour.frame(stage, time, dt);
    } else {
      /* 1 ─ scroll intro: blueprint → scan line → blue hour, on the whole facade */
      if (m.live) {
        m.live = false;
        actions.reset(FEATURED);
        setChat(false);
      }
      const patch = m.patch;
      patch.build = build;
      patch.dusk = dusk;
      if (!m.synced || !outside) {
        stage.set({ view: "dusk", build, dusk });
        m.synced = true;
      }
      stage.set(patch);
    }

    /* 2 ─ hologram HUD: fades as the photo takes over; a tag rides the scan line */
    const hud = hudRef.current;
    const hudAlpha = isExterior(stage.state.view) ? 1 - smoothstep(seg(build, 0.7, 0.97)) : 0;
    if (hud && hudAlpha !== m.hud) {
      m.hud = hudAlpha;
      hud.style.opacity = String(hudAlpha);
      hud.style.visibility = hudAlpha < 0.004 ? "hidden" : "visible";
    }
    if (hudAlpha > 0.004) {
      const line = lerp(1.06, -0.06, build) * height;
      const tag = tagRef.current;
      if (tag) {
        tag.style.transform = `translate3d(0,${line}px,0)`;
        tag.style.opacity = build > 0.02 && build < 0.97 ? "1" : "0";
        const pct = Math.round(build * 100);
        if (pct !== m.pct && tagTextRef.current) {
          m.pct = pct;
          tagTextRef.current.textContent = `${String(pct).padStart(2, "0")}%`;
        }
      }
      if (footRef.current) footRef.current.style.opacity = String(clamp((line - height + 34) / 30));
      for (let i = 0; i < CALLOUTS.length; i++) {
        const el = calloutRefs.current[i];
        if (!el) continue;
        stage.project(CALLOUTS[i], m.a);
        el.style.transform = `translate3d(${m.a.x}px,${m.a.y}px,0)`;
        // a note disappears when the scan line reaches it: the real thing replaces the drawing
        el.style.opacity = String(clamp((line - m.a.y - 4) / 40));
      }
    }

    /* 3 ─ the window's glow follows the mood: hologram green, then warm */
    const lime = 0.25 + 0.75 * (1 - build);
    const gold = isExterior(stage.state.view) ? build * (0.2 + 0.6 * dusk) : 0.75;
    if (limeRef.current && Math.abs(lime - m.lime) > 0.004) {
      m.lime = lime;
      limeRef.current.style.opacity = String(lime);
    }
    if (goldRef.current && Math.abs(gold - m.gold) > 0.004) {
      m.gold = gold;
      goldRef.current.style.opacity = String(gold);
    }

    /* 4 ─ step progress (desktop list and mobile strip): the intro fills with the scroll, the live step is simply on */
    let step = 0;
    for (let i = 0; i < COUNT; i++) {
      const from = STEPS[i].at;
      if (p >= from) step = i;
      const fill = i === COUNT - 1 ? (live ? 1 : 0) : seg(p, from, STEPS[i + 1].at);
      for (let k = 0; k < 2; k++) {
        const slot = i * 2 + k;
        const el = fillRefs.current[slot];
        if (el && fill !== m.fill[slot]) {
          m.fill[slot] = fill;
          el.style.transform = `scaleX(${fill})`;
        }
      }
    }

    /* 5 ─ everything discrete goes through React, only when it changes */
    const next = m.next;
    next.step = step;
    next.live = live;
    next.chrome = build > 0.9;
    next.hero = !live && build > 0.94 && p > T.dusk[0] - 0.02;
    if (!sameUi(next, m.ui)) {
      m.ui = { ...next };
      setUi(m.ui);
    }
  };

  const jump = (index: number) => {
    const pin = pinRef.current;
    if (!pin) return;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    const y = top + (STEPS[index].at + 0.014) * (pin.offsetHeight - window.innerHeight);
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.3 });
    else window.scrollTo({ top: y, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const towerHint = ui.live && mode === "tower";

  return (
    <div ref={pinRef} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-svh flex-col gap-3.5 overflow-hidden px-[var(--pad)] pt-[calc(var(--nav-h)+12px)] pb-3.5 lg:flex-row lg:items-center lg:gap-[clamp(28px,3.6vw,60px)] lg:pb-7">
        {/* ── The browser window ── */}
        <div className="relative order-1 flex min-h-0 flex-1 items-center justify-center [container-type:size] lg:order-2 lg:h-full lg:flex-[7]">
          <div
            role="region"
            aria-label={
              ui.live
                ? copy.regionLive
                : copy.regionIntro
            }
            className="relative flex h-full w-full flex-col lg:h-[min(100cqh,calc(100cqw/1.22))]"
          >
            <div
              ref={limeRef}
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -bottom-10 top-1/3 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,rgb(62_242_196/0.34),transparent)] blur-2xl"
            />
            <div
              ref={goldRef}
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -bottom-10 top-1/3 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,rgb(231_170_110/0.3),transparent)] opacity-0 blur-2xl"
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line-2 bg-[#04090b] shadow-[0_40px_120px_-60px_rgb(0_0_0/0.9)]">
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-[#060d0e] px-3.5 font-mono text-[11px] font-medium text-mute lg:h-10 lg:px-4">
                <i className="h-2.5 w-2.5 rounded-full bg-[#26302c]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[#26302c]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[#26302c]" />
                <span className="ml-2 flex min-w-0 items-center gap-2 rounded-full border border-line px-3.5 py-[3px]">
                  <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden className="shrink-0">
                    <rect x="0.6" y="4.6" width="7.8" height="5.8" rx="1.2" stroke="currentColor" />
                    <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" />
                  </svg>
                  <span className="truncate">{AURORA.domain}</span>
                </span>
                <span className="ml-auto hidden shrink-0 tracking-[0.06em] text-dim xl:inline">{copy.tag}</span>
                <Link
                  href="/demos/imobiliarias"
                  className="group ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-acc px-3 font-sans text-[12px] font-bold whitespace-nowrap text-[#061006] transition-shadow duration-300 hover:shadow-[0_0_28px_rgb(185_255_75/0.5)] xl:ml-3 lg:h-[30px] lg:px-3.5 lg:text-[12.5px]"
                >
                  {copy.openFull}
                  <span aria-hidden className="transition-transform duration-300 ease-soft group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </Link>
              </div>

              <div
                ref={(el) => {
                  rootRef.current = el;
                }}
                lang="pt-BR"
                tabIndex={ui.live ? 0 : -1}
                aria-label={ui.live ? copy.keys : undefined}
                onKeyDown={ui.live ? tour.onKeyDown : undefined}
                className="@container relative min-h-0 flex-1 outline-none focus-visible:ring-1 focus-visible:ring-au-gold/60 focus-visible:ring-inset"
              >
                <AuroraStage
                  {...tour.stageProps}
                  interactive={ui.live}
                  initial={{ view: "blueprint" }}
                  preload={PRELOAD}
                  padding={{ plan: { top: wide ? 56 : 44, bottom: wide ? 112 : 132 } }}
                  onResize={(w) => {
                    setWide(w >= 576);
                    tour.resized(w);
                  }}
                  onFrame={frame}
                >
                  <div inert className="pointer-events-none absolute inset-0">
                    {/* hologram HUD (MatsuHub's voice: the site does not exist yet) */}
                    <div
                      ref={hudRef}
                      className="pointer-events-none absolute inset-0 z-[2] font-mono text-[9.5px] leading-none font-medium tracking-[0.16em] text-acc uppercase"
                    >
                      <i className="absolute top-3 left-3 h-3.5 w-3.5 border-t border-l border-acc/60" />
                      <i className="absolute top-3 right-3 h-3.5 w-3.5 border-t border-r border-acc/60" />
                      <i className="absolute bottom-3 left-3 h-3.5 w-3.5 border-b border-l border-acc/60" />
                      <i className="absolute right-3 bottom-3 h-3.5 w-3.5 border-r border-b border-acc/60" />
                      <p className="absolute top-5 left-5 flex items-center gap-2 bg-[#04090b]/80 px-1.5 py-1.5">
                        <i className="h-1.5 w-1.5 animate-blink rounded-full bg-acc shadow-[0_0_10px_var(--color-acc)]" />
                        Briefing · wireframe
                      </p>
                      <p className="absolute top-[44px] left-5 px-1.5 text-acc/45 @max-xl:hidden">
                        Aurora Residence · rev. 03
                      </p>
                      <p className="absolute top-5 right-5 px-1.5 py-1.5 text-acc/45 @max-xl:hidden">esc. 1:500</p>
                      <p ref={footRef} className="absolute bottom-5 left-5 bg-[#04090b]/80 px-1.5 py-1.5 text-acc/55">
                        {AURORA.location}
                      </p>
                      {CALLOUTS.map((note, i) => (
                        <span
                          key={note.text}
                          ref={(el) => {
                            calloutRefs.current[i] = el;
                          }}
                          className="absolute top-0 left-0 h-0 w-0 opacity-0 will-change-transform @max-xl:hidden"
                        >
                          <span
                            className={cn(
                              "absolute top-0 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap",
                              note.side === 1 ? "left-0" : "right-0 flex-row-reverse",
                            )}
                          >
                            <i className="h-[5px] w-[5px] shrink-0 rounded-full bg-acc" />
                            <i className="h-px w-9 shrink-0 bg-acc/50" />
                            {note.text}
                          </span>
                        </span>
                      ))}
                      <div ref={tagRef} className="absolute top-0 right-0 opacity-0 transition-opacity duration-300 will-change-transform">
                        <span className="absolute right-4 bottom-2 flex items-center gap-2 whitespace-nowrap text-acc">
                          <span className="@max-xl:hidden">{copy.building}</span>
                          <span ref={tagTextRef} className="bg-acc px-1.5 py-1 font-bold text-[#061006] tabular-nums">
                            00%
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* from here on it is Aurora's own site */}
                    <AuroraTopBar
                      className={cn("z-[4] transition-opacity duration-700 ease-soft", ui.chrome ? "opacity-100" : "opacity-0")}
                    />

                    <div
                      data-open={ui.hero}
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-au-bg/90 via-au-bg/40 to-transparent px-4 pt-24 pb-4 transition-[opacity,translate] duration-700 ease-soft data-[open=false]:translate-y-3 data-[open=false]:opacity-0 @xl:flex @xl:items-end @xl:justify-between @xl:gap-6 @xl:px-6 @xl:pb-6"
                    >
                      <div>
                        <AuroraEyebrow>{AURORA.location}</AuroraEyebrow>
                        <p className="mt-3 max-w-[13ch] font-aurora text-[clamp(27px,5.4cqw,46px)] leading-[1.02] text-au-ink">
                          {AURORA.tagline}
                        </p>
                        <p className="mt-3 text-[11.5px] leading-snug text-au-mute">{AURORA.delivery}</p>
                      </div>
                      <dl className="hidden gap-7 @2xl:flex">
                        {AURORA.facts.slice(0, 3).map((fact) => (
                          <div key={fact.label} className="border-l border-au-line pl-3.5">
                            <dt className="font-aurora text-[22px] leading-none text-au-ink">{fact.value}</dt>
                            <dd className="mt-2 max-w-[11ch] text-[9px] leading-snug font-semibold tracking-[0.2em] text-au-mute uppercase">
                              {fact.label}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                  </div>

                  {/* the live tour: real hover, clicks and taps */}
                  <div inert={!ui.live} className={cn("transition-opacity duration-500", ui.live ? "opacity-100" : "opacity-0")}>
                    <AuroraTourLayer tour={tour} />
                    <div
                      data-open={towerHint}
                      className="pointer-events-none absolute bottom-5 left-5 z-[2] border border-au-line bg-au-bg/70 px-3 py-2.5 backdrop-blur-md transition-opacity duration-500 data-[open=false]:opacity-0 @max-xl:inset-x-auto @max-xl:top-[52px] @max-xl:bottom-auto @max-xl:left-3"
                    >
                      <AuroraTourHint tour={tour} />
                    </div>
                    <button
                      type="button"
                      aria-pressed={chat}
                      onClick={() => setChat((open) => !open)}
                      className="absolute top-[52px] right-3 z-[6] flex items-center gap-2 border border-au-line bg-au-bg/75 px-3 py-2 text-[9.5px] leading-none font-bold tracking-[0.2em] text-au-ink uppercase backdrop-blur-md transition-colors hover:border-au-gold hover:text-au-gold focus-visible:outline-au-gold aria-pressed:border-au-gold @xl:top-[68px] @xl:right-6"
                    >
                      <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#7fe3a3] shadow-[0_0_8px_#7fe3a3]" />
                      {chat ? "Fechar chat" : "Falar com a Lia"}
                    </button>
                    <AuroraChat open={ui.live && chat} />
                  </div>
                </AuroraStage>
              </div>
            </div>
          </div>
        </div>

        {/* ── MatsuHub's commentary ── */}
        <div className="order-2 flex shrink-0 flex-col lg:order-1 lg:h-full lg:flex-[3] lg:justify-center lg:py-4">
          <ol className="grid">
            {STEPS.map((item, i) => (
              <li
                key={item.id}
                data-state={i === ui.step ? "on" : i < ui.step ? "past" : "next"}
                className="col-start-1 row-start-1 transition-[opacity,translate] duration-300 ease-soft data-[state=next]:translate-y-4 data-[state=next]:opacity-0 data-[state=on]:delay-200 data-[state=on]:duration-600 data-[state=past]:-translate-y-4 data-[state=past]:opacity-0"
              >
                <p className="label flex items-center gap-2.5 text-[11px] lg:text-[12px]">
                  <span className="text-dim tabular-nums">
                    0{i + 1}/0{COUNT}
                  </span>
                  {item.label}
                  {i === COUNT - 1 && <i aria-hidden className="h-1.5 w-1.5 animate-blink rounded-full bg-acc shadow-[0_0_10px_var(--color-acc)]" />}
                </p>
                <h3 className="mt-2.5 font-display text-[clamp(21px,2.55vw,38px)] leading-[1.08] font-semibold tracking-[-0.03em] lg:mt-5">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-[36ch] text-[13.5px] leading-snug text-mute lg:mt-4 lg:text-[15.5px] lg:leading-relaxed">
                  {item.touch ? (
                    <>
                      <span className="[@media(pointer:coarse)]:hidden">{item.text}</span>
                      <span className="hidden [@media(pointer:coarse)]:inline">{item.touch}</span>
                    </>
                  ) : (
                    item.text
                  )}
                </p>
                <div inert={ui.step !== i} className="mt-3 lg:mt-7">
                  <Button href="/demos/imobiliarias" size="sm" className="max-lg:w-full lg:hidden">
                    {copy.openDemo}
                  </Button>
                  <Button href="/demos/imobiliarias" className="max-lg:hidden">
                    {copy.openDemo}
                  </Button>
                </div>
              </li>
            ))}
          </ol>

          {/* step list with progress (desktop): also a way to jump around */}
          <ol className="mt-10 hidden max-w-[330px] lg:block">
            {STEPS.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={i === ui.step ? "step" : undefined}
                  className="group relative flex w-full items-center gap-3 py-[7px] text-left font-mono text-[11px] font-medium tracking-[0.1em] text-dim uppercase transition-colors hover:text-ink aria-[current=step]:text-acc"
                >
                  <span className="tabular-nums opacity-70">0{i + 1}</span>
                  <span className="w-[19ch] shrink-0 whitespace-nowrap">{item.label}</span>
                  <span className="relative h-px flex-1 bg-line">
                    <i
                      ref={(el) => {
                        fillRefs.current[i * 2] = el;
                      }}
                      style={EMPTY}
                      className="absolute inset-0 block origin-left bg-acc shadow-[0_0_8px_var(--color-acc)]"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {/* the same progress as a strip (mobile) */}
          <div aria-hidden className="mt-3 flex gap-1.5 lg:hidden">
            {STEPS.map((item, i) => (
              <span key={item.id} className="relative h-[2px] flex-1 overflow-hidden bg-line-2">
                <i
                  ref={(el) => {
                    fillRefs.current[i * 2 + 1] = el;
                  }}
                  style={EMPTY}
                  className="absolute inset-0 block origin-left bg-acc"
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
