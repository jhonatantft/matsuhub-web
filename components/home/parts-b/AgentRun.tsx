"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp } from "@/lib/math";
import { onFrame } from "@/lib/ticker";
import { AgentGraph, type GraphState } from "./AgentGraph";
import { AgentTrace } from "./AgentTrace";
import { CALL_BACK, CALL_OUT, SCENARIOS, TIMELINES, fmtSeconds, type Timeline } from "./agentScenarios";

type Mode = "idle" | "playing" | "done" | "static";

/** Seconds a finished run stays on screen before autoplay moves to the next scenario. */
const HOLD = 6.5;

/** Derives everything the panel shows from the timeline and the elapsed animation time. Pure. */
function derive(tl: Timeline, elapsed: number) {
  let current = -1;
  let lastDone = -1;
  tl.steps.forEach((s, i) => {
    if (elapsed >= s.start && elapsed < s.end) current = i;
    if (elapsed >= s.end) lastDone = i;
  });
  const cur = current >= 0 ? tl.steps[current] : null;
  const local = cur ? clamp((elapsed - cur.start) / (cur.end - cur.start)) : 0;
  const sim = cur
    ? cur.simStart + cur.sim * local
    : lastDone >= 0
      ? tl.steps[lastDone].simStart + tl.steps[lastDone].sim
      : 0;

  const used = new Set<string>();
  for (const s of tl.steps) if (elapsed >= s.end && s.kind === "tool") used.add(s.tool);

  let active: string | null = null;
  let calling = false;
  if (cur && "tool" in cur) {
    active = cur.tool;
    calling = cur.kind === "tool" && local < CALL_BACK;
  }

  const graph: GraphState = {
    active,
    calling,
    used,
    thinking: cur?.kind === "think",
    finished: elapsed >= tl.total - 0.001,
    pulseKey: current,
  };
  const toolCalls = tl.steps.filter((s) => s.kind === "tool" && elapsed >= s.end).length;
  const stepsDone = lastDone + 1;
  return { graph, sim, toolCalls, stepsDone };
}

export function AgentRun() {
  const [sIdx, setSIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");

  const rootRef = useRef<HTMLDivElement>(null);
  const graphBoxRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const pathsRef = useRef(new Map<string, SVGPathElement>());
  const sizeRef = useRef({ w: 0, h: 0 });
  const visibleRef = useRef(false);
  const autoRef = useRef(true);
  const elRef = useRef(0);
  const holdRef = useRef(0);
  const reducedRef = useRef(false);
  const configured = useRef(false);

  const sc = SCENARIOS[sIdx];
  const tl = TIMELINES[sIdx];

  /* Autoplay when scrolled into view; config (reduced motion, lab overrides) on the first callback. */
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (!configured.current) {
          configured.current = true;
          reducedRef.current = reducedMotion();
          // Lab overrides for screenshots: ?scenario=1&run=4.5 freezes the run at 4.5 s.
          const fs = labParam("scenario");
          const idx = fs === null ? 0 : clamp(Math.round(fs), 0, SCENARIOS.length - 1);
          const forced = labParam("run");
          if (idx !== 0) setSIdx(idx);
          if (forced !== null || reducedRef.current) {
            autoRef.current = false;
            const t = forced ?? TIMELINES[idx].total;
            elRef.current = t;
            setElapsed(t);
            setMode("static");
            return;
          }
        }
        if (entry.isIntersecting) setMode((m) => (m === "idle" ? "playing" : m));
      },
      // "in view" = the panel's top has passed the lower quarter of the viewport
      { rootMargin: "0px 0px -22% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* Graph box size, for placing the pulse in pixels (transform only). */
  useEffect(() => {
    const box = graphBoxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([e]) => {
      sizeRef.current = { w: e.contentRect.width, h: e.contentRect.height };
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  /* The run itself: advances only while on screen and the tab is visible. */
  useEffect(() => {
    if (mode !== "playing" && mode !== "done") return;
    const timeline = TIMELINES[sIdx];
    const pulse = pulseRef.current;

    const drawPulse = (t: number) => {
      if (!pulse) return;
      const step = timeline.steps.find((s) => t >= s.start && t < s.end);
      const path = step && "tool" in step ? pathsRef.current.get(step.tool) : undefined;
      if (!step || !path) {
        pulse.style.opacity = "0";
        return;
      }
      const local = (t - step.start) / (step.end - step.start);
      // 0 = at the core, 1 = at the tool.
      let p: number;
      if (step.kind === "tool") {
        if (local < CALL_OUT) p = local / CALL_OUT;
        else if (local < CALL_BACK) p = 1 - (local - CALL_OUT) / (CALL_BACK - CALL_OUT);
        else {
          pulse.style.opacity = "0";
          return;
        }
      } else if (step.kind === "in") p = 1 - clamp(local / 0.8);
      else p = clamp(local / (step.kind === "reply" ? 0.35 : 0.8));
      const len = path.getTotalLength();
      // Paths are drawn from the core to the tool in a 0..100 viewBox.
      const pt = path.getPointAtLength(len * p);
      const { w, h } = sizeRef.current;
      pulse.style.opacity = p <= 0.001 || p >= 0.999 ? "0" : "1";
      pulse.style.transform = `translate3d(${(pt.x / 100) * w}px, ${(pt.y / 100) * h}px, 0)`;
    };

    return onFrame((_time, dt) => {
      if (!visibleRef.current || document.hidden) return;
      if (mode === "playing") {
        elRef.current = Math.min(timeline.total, elRef.current + dt);
        setElapsed(Math.round(elRef.current * 40) / 40);
        drawPulse(elRef.current);
        if (elRef.current >= timeline.total) {
          holdRef.current = 0;
          setMode("done");
        }
        return;
      }
      if (!autoRef.current) return;
      holdRef.current += dt;
      if (holdRef.current > HOLD) {
        elRef.current = 0;
        setElapsed(0);
        setSIdx((sIdx + 1) % SCENARIOS.length);
        setMode("playing");
      }
    });
  }, [mode, sIdx]);

  const start = (idx: number) => {
    autoRef.current = false;
    holdRef.current = 0;
    setSIdx(idx);
    if (reducedRef.current) {
      elRef.current = TIMELINES[idx].total;
      setElapsed(elRef.current);
      setMode("static");
      return;
    }
    elRef.current = 0;
    setElapsed(0);
    setMode("playing");
  };

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = SCENARIOS.length;
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % n;
    else if (e.key === "ArrowLeft") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    start(next);
    document.getElementById(`agent-tab-${SCENARIOS[next].id}`)?.focus();
  };

  const d = derive(tl, elapsed);
  const finished = d.graph.finished;
  const status = mode === "idle" ? "aguardando" : finished ? "concluído" : "executando";

  return (
    <div ref={rootRef} className="relative">
      {/* halo behind the panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-[8%] -top-[12%] bottom-[-10%] bg-[radial-gradient(50%_45%_at_35%_45%,rgb(185_255_75/0.11),transparent_70%),radial-gradient(40%_40%_at_75%_60%,rgb(62_242_196/0.09),transparent_70%)]"
      />

      <div className="relative overflow-hidden rounded-[26px] border border-line bg-[linear-gradient(180deg,rgb(14_22_18/0.92),rgb(6_10_8/0.94))] shadow-[0_40px_120px_-60px_rgb(185_255_75/0.5),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl">
        {/* top hairline light */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(185_255_75/0.7),rgb(62_242_196/0.5),transparent)]"
        />

        {/* ── header ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-line px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 font-mono md:flex-none text-[11px] tracking-[0.08em] text-mute uppercase">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                finished ? "bg-acc-2 shadow-[0_0_10px_var(--color-acc-2)]" : "animate-blink bg-acc shadow-[0_0_10px_var(--color-acc)]",
              )}
            />
            <span className="truncate">
              agente · <span className="text-ink">{sc.agent}</span>
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Cenários de exemplo"
            className="order-last flex w-full gap-1 rounded-full border border-line bg-black/30 p-1 md:order-none md:mx-auto md:w-auto"
          >
            {SCENARIOS.map((s, i) => {
              const sel = i === sIdx;
              return (
                <button
                  key={s.id}
                  id={`agent-tab-${s.id}`}
                  type="button"
                  role="tab"
                  aria-selected={sel}
                  aria-controls="agent-run-panel"
                  tabIndex={sel ? 0 : -1}
                  onClick={() => start(i)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={cn(
                    "relative flex-1 cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-300 ease-soft md:flex-none md:px-4",
                    sel ? "bg-acc text-[#061006] shadow-[0_0_24px_-4px_rgb(185_255_75/0.6)]" : "text-mute hover:text-ink",
                  )}
                >
                  {s.tab}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <span className="chip border-warm/30 text-warm">simulação</span>
            <span className="hidden font-mono text-[12px] text-mute tabular-nums sm:inline" aria-hidden>
              {fmtSeconds(d.sim)}
            </span>
            <button
              type="button"
              onClick={() => start(sIdx)}
              aria-label="Repetir a simulação"
              className="group relative grid h-8 w-8 cursor-pointer before:absolute before:-inset-[5px] before:content-[''] place-items-center rounded-full border border-line-2 text-mute transition-colors duration-300 hover:border-acc hover:text-acc"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[15px] w-[15px] transition-transform duration-500 ease-soft group-hover:-rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── body ── */}
        <div
          id="agent-run-panel"
          role="tabpanel"
          aria-labelledby={`agent-tab-${sc.id}`}
          className="grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
        >
          <div className="relative flex flex-col border-b border-line lg:border-r lg:border-b-0">
            <AgentGraph
              tools={sc.tools}
              state={d.graph}
              boxRef={graphBoxRef}
              pulseRef={pulseRef}
              pathsRef={pathsRef}
              steps={tl.steps}
              elapsed={elapsed}
            />
            <dl className="grid grid-cols-3 border-t border-line">
              {[
                ["Passos", `${d.stepsDone}/${tl.steps.length}`],
                ["Ferramentas", String(d.toolCalls)],
                ["Tempo", fmtSeconds(d.sim)],
              ].map(([k, v], i) => (
                <div key={k} className={cn("px-4 py-3.5 sm:px-6", i > 0 && "border-l border-line")}>
                  <dt className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">{k}</dt>
                  <dd className="mt-1 font-display text-[17px] font-semibold text-ink tabular-nums sm:text-[19px]">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="flex items-center gap-2.5 border-t border-line px-4 py-3 font-mono text-[11px] text-mute sm:px-6">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-acc-2" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M12 3 5 6v5.5c0 4.2 2.9 7.7 7 9.5 4.1-1.8 7-5.3 7-9.5V6Z" />
                <path d="m9 12 2.2 2.2L15.5 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Humano no controle · cada passo fica registrado
            </p>
          </div>

          <AgentTrace scenario={sc} timeline={tl} elapsed={elapsed} status={status} />
        </div>
      </div>
    </div>
  );
}
