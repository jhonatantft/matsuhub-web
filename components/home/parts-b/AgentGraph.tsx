"use client";

import { cn } from "@/lib/cn";
import { dict, type Dictionary, type Lang } from "@/lib/i18n";
import type { TimedStep, Tool } from "./agentScenarios";
import { ToolIcon } from "./icons";

export type GraphState = {
  /** Tool the current step talks to. */
  active: string | null;
  /** True while a tool call is waiting for its result. */
  calling: boolean;
  /** Tools that already answered a call. */
  used: Set<string>;
  thinking: boolean;
  finished: boolean;
  /** Changes on every step, to retrigger the core ripple. */
  pulseKey: number;
};

const CORE = { x: 50, y: 50 };

/** Circuit-like S-curve from the core to a tool, in a 0..100 box. */
const edge = (t: Tool) => {
  const mx = CORE.x + (t.x - CORE.x) * 0.5;
  return `M${CORE.x} ${CORE.y} C${mx} ${CORE.y} ${mx} ${t.y} ${t.x} ${t.y}`;
};

function toolStatus(t: Tool, state: GraphState, steps: TimedStep[], elapsed: number, w: Dictionary["agentRun"]["tool"]) {
  if (state.active === t.id) {
    const step = steps.find((s) => elapsed >= s.start && elapsed < s.end);
    if (step?.kind === "in") return w.receiving;
    if (step?.kind === "reply") return w.sending;
    if (step?.kind === "done") return w.notifying;
    return state.calling ? w.calling : w.answered;
  }
  const past = steps.filter((s) => "tool" in s && s.tool === t.id && elapsed >= s.end);
  const last = past[past.length - 1];
  if (!last) return w.ready;
  if (last.kind === "tool") return `${w.ok} · ${last.ms} ms`;
  if (last.kind === "done") return w.notified;
  if (last.kind === "reply") return w.sent;
  return w.ok;
}

type Props = {
  tools: Tool[];
  state: GraphState;
  steps: TimedStep[];
  elapsed: number;
  boxRef: React.RefObject<HTMLDivElement | null>;
  pulseRef: React.RefObject<HTMLDivElement | null>;
  pathsRef: React.RefObject<Map<string, SVGPathElement>>;
  lang?: Lang;
};

/** The agent core with its tools around it. The travelling pulse is positioned by AgentRun's frame loop. */
export function AgentGraph({ tools, state, steps, elapsed, boxRef, pulseRef, pathsRef, lang = "pt" }: Props) {
  const d = dict(lang).agentRun;
  const touched = (id: string) => steps.some((s) => "tool" in s && s.tool === id && elapsed >= s.end);

  return (
    <div className="relative flex flex-1 items-center px-3 py-6 sm:px-6 sm:py-8">
      {/* dotted backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(190_255_215/0.13)_1px,transparent_1.2px)] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)] bg-[length:18px_18px]"
      />

      <div ref={boxRef} className="relative [--icon-half:22px] sm:[--icon-half:26px] mx-auto aspect-[1/0.95] w-full max-w-[560px] sm:aspect-[1.25/1] lg:aspect-[1/0.92]">
        {/* edges */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="agent-edge-hot" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--color-acc)" />
              <stop offset="1" stopColor="var(--color-acc-2)" />
            </linearGradient>
          </defs>
          {tools.map((t) => {
            const hot = state.active === t.id;
            const used = touched(t.id);
            const d = edge(t);
            return (
              <g key={t.id}>
                <path
                  ref={(n) => {
                    if (n) pathsRef.current.set(t.id, n);
                    else pathsRef.current.delete(t.id);
                  }}
                  d={d}
                  fill="none"
                  stroke="rgb(190 255 215 / 0.2)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="var(--color-acc-2)"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  className="transition-opacity duration-700 ease-soft"
                  style={{ opacity: used && !hot ? 0.45 : 0 }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke="var(--color-acc)"
                  strokeWidth="7"
                  vectorEffect="non-scaling-stroke"
                  className="transition-opacity duration-500 ease-soft"
                  style={{ opacity: hot ? 0.16 : 0 }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke="var(--color-acc)"
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                  className="transition-opacity duration-300 ease-soft"
                  style={{ opacity: hot ? 1 : 0 }}
                />
              </g>
            );
          })}
        </svg>

        {/* travelling pulse (position set imperatively) */}
        <div ref={pulseRef} aria-hidden className="pointer-events-none absolute top-0 left-0 z-[3] opacity-0">
          <span className="absolute -top-[5px] -left-[5px] h-[10px] w-[10px] rounded-full bg-[#f4ffe0] shadow-[0_0_10px_2px_var(--color-acc),0_0_28px_6px_rgb(185_255_75/0.45)]" />
        </div>

        {/* core */}
        <div
          className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${CORE.x}%`, top: `${CORE.y}%` }}
          aria-hidden
        >
          <div className="relative grid h-[84px] w-[84px] place-items-center sm:h-[112px] sm:w-[112px]">
            <span
              key={state.pulseKey}
              className="mhb-ripple absolute inset-0 rounded-full border border-acc/60"
            />
            <span className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-acc/35" />
            <span className="absolute inset-[9px] rounded-full border border-line-2 bg-[radial-gradient(circle_at_50%_35%,rgb(185_255_75/0.22),rgb(5_8_7/0.9)_70%)] sm:inset-[12px]" />
            <span
              className={cn(
                "absolute inset-[9px] rounded-full transition-[box-shadow,opacity] duration-500 sm:inset-[12px]",
                state.thinking ? "mhb-breathe shadow-[0_0_50px_6px_rgb(185_255_75/0.45)]" : "",
                state.finished ? "shadow-[0_0_40px_2px_rgb(62_242_196/0.4)]" : "",
                state.active && !state.thinking ? "shadow-[0_0_34px_0_rgb(185_255_75/0.35)]" : "",
              )}
            />
            <span className="relative flex flex-col items-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" aria-hidden>
                <path d="M12 3 3 20h18L12 3Zm0 11-9 6m9-6 9 6m-9-6V3" stroke="var(--color-acc)" strokeWidth="1.4" />
                <circle cx="12" cy="14" r="2.2" fill="var(--color-acc)" />
              </svg>
              <span className="mt-1 font-mono text-[9px] tracking-[0.18em] text-acc uppercase sm:text-[10px]">
                {state.thinking ? d.core.thinking : state.finished ? d.core.done : d.core.idle}
              </span>
            </span>
          </div>
        </div>

        {/* tools */}
        <ul className="contents">
          {tools.map((t) => {
            const hot = state.active === t.id;
            const used = touched(t.id);
            const right = t.x > 50;
            return (
              <li
                key={t.id}
                className="absolute z-[2]"
                style={{
                  top: `${t.y}%`,
                  left: `${t.x}%`,
                  // the icon sits on the edge's end; the label points inward
                  translate: right ? "calc(-100% + var(--icon-half)) -50%" : "calc(-1 * var(--icon-half)) -50%",
                }}
              >
                <div
                  className={cn(
                    right && "flex-row-reverse text-right",
                    "flex items-center gap-2 rounded-[14px] border px-2 py-1.5 backdrop-blur-md transition-[border-color,background-color,box-shadow,transform] duration-500 ease-soft sm:gap-2.5 sm:px-2.5 sm:py-2",
                    hot
                      ? "scale-[1.06] border-acc/80 bg-[rgb(28_40_14/0.92)] shadow-[0_0_0_4px_rgb(185_255_75/0.08),0_0_36px_-2px_rgb(185_255_75/0.5)]"
                      : used
                        ? "border-acc-2/35 bg-[rgb(8_20_17/0.88)]"
                        : "border-line bg-[rgb(9_14_12/0.88)]",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border transition-colors duration-500 sm:h-8 sm:w-8",
                      hot ? "border-acc/60 bg-acc text-[#061006]" : used ? "border-acc-2/30 text-acc-2" : "border-line text-mute",
                    )}
                  >
                    <ToolIcon name={t.icon} className="h-4 w-4" />
                  </span>
                  <span className={cn("flex min-w-0 flex-col", right ? "items-end pl-1" : "pr-1")}>
                    <span className="max-w-[72px] text-[10.5px] leading-[1.15] font-semibold text-ink sm:max-w-[160px] sm:text-[12.5px]">
                      {t.label}
                    </span>
                    <span
                      className={cn(
                        "hidden font-mono text-[10px] leading-tight whitespace-nowrap sm:block",
                        hot ? "text-acc" : used ? "text-acc-2/80" : "text-dim",
                      )}
                    >
                      {toolStatus(t, state, steps, elapsed, d.tool)}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
