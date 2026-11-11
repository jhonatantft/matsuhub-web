"use client";

import { cn } from "@/lib/cn";
import { CALL_BACK, TYPE_CPS, fmtSeconds, type Scenario, type Timeline, type TimedStep } from "./agentScenarios";
import { ToolIcon } from "./icons";

/* Keyframes for the agent panel (scoped by the mhb- prefix). */
const CSS = `
@keyframes mhb-ripple { from { transform: scale(.85); opacity: .9 } to { transform: scale(1.9); opacity: 0 } }
@keyframes mhb-breathe { 50% { opacity: .55 } }
@keyframes mhb-shimmer { to { background-position: -200% 0 } }
@keyframes mhb-caret { 50% { opacity: 0 } }
@keyframes mhb-spin { to { transform: rotate(360deg) } }
@keyframes mhb-pop { from { transform: scale(.4); opacity: 0 } }
.mhb-ripple { animation: mhb-ripple 1.1s cubic-bezier(.2,.8,.2,1) forwards }
.mhb-breathe { animation: mhb-breathe 1.2s ease-in-out infinite }
.mhb-shimmer {
  background: linear-gradient(90deg, var(--color-mute) 0%, var(--color-mute) 40%, var(--color-ink) 50%, var(--color-mute) 60%, var(--color-mute) 100%) 0 0 / 200% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: mhb-shimmer 1.6s linear infinite;
}
.mhb-caret { animation: mhb-caret .9s steps(1) infinite }
.mhb-spin { animation: mhb-spin .8s linear infinite }
.mhb-pop { animation: mhb-pop .6s cubic-bezier(.2,.8,.2,1) both }
@media (prefers-reduced-motion: reduce) {
  .mhb-ripple { display: none }
  .mhb-shimmer { animation: none; color: var(--color-mute); background: none }
}
`;

const TAG: Record<TimedStep["kind"], string> = {
  in: "entrada",
  think: "pensar",
  tool: "ferramenta",
  reply: "responder",
  done: "feito",
};

/** `obj.method(args)` with the namespace tinted. */
function Call({ text }: { text: string }) {
  const dot = text.indexOf(".");
  const paren = text.indexOf("(");
  if (dot < 0 || paren < 0 || dot > paren) return <>{text}</>;
  return (
    <>
      <span className="text-acc-2">{text.slice(0, dot)}</span>
      <span className="text-dim">.</span>
      <span className="text-ink">{text.slice(dot + 1, paren)}</span>
      <span className="text-mute">{text.slice(paren)}</span>
    </>
  );
}

type Props = { scenario: Scenario; timeline: Timeline; elapsed: number; status: string };

export function AgentTrace({ scenario, timeline, elapsed, status }: Props) {
  const toolLabel = (id: string) => scenario.tools.find((t) => t.id === id)?.label ?? id;
  const finished = status === "concluído";

  return (
    <div className="flex min-w-0 flex-col">
      <style href="mhb-agent-run" precedence="default">
        {CSS}
      </style>

      <div className="flex items-center justify-between border-b border-line px-4 py-3 font-mono text-[10.5px] tracking-[0.14em] text-dim uppercase sm:px-6">
        <span>registro da execução</span>
        <span className={cn("flex items-center gap-2", finished ? "text-acc-2" : status === "executando" ? "text-acc" : "")}>
          {status === "executando" && (
            <span aria-hidden className="mhb-spin h-2.5 w-2.5 rounded-full border border-current border-t-transparent" />
          )}
          {status}
        </span>
      </div>

      <ol className="relative flex-1 px-4 pt-5 pb-6 sm:px-6" aria-label={`Simulação: ${scenario.tab}`}>
        {timeline.steps.map((s, i) => {
          const shown = elapsed >= s.start;
          const active = shown && elapsed < s.end;
          const done = elapsed >= s.end;
          const local = active ? (elapsed - s.start) / (s.end - s.start) : done ? 1 : 0;
          const last = i === timeline.steps.length - 1;
          const stamp = `+${fmtSeconds(s.simStart + (s.kind === "tool" || s.kind === "think" ? 0 : s.sim))}`;

          return (
            <li
              key={`${scenario.id}-${i}`}
              className={cn(
                "relative grid grid-cols-[14px_minmax(0,1fr)] gap-x-3 pb-3.5 transition-[opacity,transform] duration-500 ease-soft sm:grid-cols-[76px_14px_minmax(0,1fr)] sm:gap-x-3.5",
                shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
              )}
            >
              {/* gutter */}
              <div className="hidden pt-[3px] text-right sm:block">
                <div
                  className={cn(
                    "font-mono text-[9.5px] font-medium tracking-[0.1em] uppercase sm:text-[10.5px]",
                    s.kind === "done" ? "text-acc" : s.kind === "think" ? "text-warm" : "text-acc-2",
                  )}
                >
                  {TAG[s.kind]}
                </div>
                <div className="mt-0.5 font-mono text-[9.5px] text-dim tabular-nums sm:text-[10px]">{stamp}</div>
              </div>

              {/* rail */}
              <div className="relative flex justify-center" aria-hidden>
                {!last && <span className="absolute top-[14px] bottom-[-4px] w-px bg-line" />}
                <span
                  className={cn(
                    "relative mt-[4px] h-[9px] w-[9px] rounded-full border transition-colors duration-500",
                    active
                      ? "border-acc bg-acc shadow-[0_0_12px_var(--color-acc)]"
                      : done
                        ? s.kind === "done"
                          ? "border-acc bg-acc"
                          : "border-acc-2/70 bg-acc-2/25"
                        : "border-line-2 bg-bg",
                  )}
                />
              </div>

              {/* content */}
              <div className="min-w-0">
                <p className="mb-1.5 flex gap-2 font-mono text-[10px] tracking-[0.1em] uppercase sm:hidden">
                  <span className={s.kind === "done" ? "text-acc" : s.kind === "think" ? "text-warm" : "text-acc-2"}>{TAG[s.kind]}</span>
                  <span className="text-dim tabular-nums">{stamp}</span>
                </p>
                {s.kind === "in" && (
                  <div className="max-w-[440px] rounded-[16px] rounded-tl-[5px] border border-line bg-white/[0.035] px-3.5 py-2.5">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10.5px] text-mute">
                      <ToolIcon name="chat" className="h-3.5 w-3.5 text-acc-2" />
                      {s.channel} · {s.from}
                    </div>
                    <p className="text-[14px] leading-snug text-ink sm:text-[14.5px]">{s.text}</p>
                  </div>
                )}

                {s.kind === "think" && (
                  <p
                    className={cn(
                      "pt-[1px] text-[13.5px] leading-snug italic sm:text-[14px]",
                      active ? "mhb-shimmer" : "text-mute",
                    )}
                  >
                    {s.text}
                  </p>
                )}

                {s.kind === "tool" && (
                  <div>
                    <div className="overflow-x-auto rounded-[10px] border border-line bg-black/35 px-3 py-[7px] font-mono text-[12px] break-words sm:text-[12.5px]">
                      <Call text={s.call} />
                    </div>
                    <div className="mt-1.5 flex min-h-[20px] items-center gap-2 font-mono text-[11.5px] sm:text-[12px]">
                      {local < CALL_BACK ? (
                        <>
                          <span aria-hidden className="mhb-spin h-3 w-3 shrink-0 rounded-full border-[1.5px] border-acc border-t-transparent" />
                          <span className="text-dim">consultando {toolLabel(s.tool)}…</span>
                        </>
                      ) : (
                        <>
                          <span className="text-acc-2">→</span>
                          <span className="min-w-0 flex-1 text-ink">{s.result}</span>
                          <span className="shrink-0 text-dim tabular-nums">{s.ms} ms</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {s.kind === "reply" && (
                  <div className="max-w-[460px] rounded-[16px] rounded-tl-[5px] border border-acc/25 bg-acc/[0.06] px-3.5 py-2.5">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10.5px] text-acc">
                      <ToolIcon name="chat" className="h-3.5 w-3.5" />
                      resposta · {toolLabel(s.tool)}
                    </div>
                    <p className="grid text-[14px] leading-snug text-ink sm:text-[14.5px]">
                      {/* full text reserves the height; the typed text sits on top */}
                      <span className="invisible col-start-1 row-start-1" aria-hidden>
                        {s.text}
                      </span>
                      <span className="col-start-1 row-start-1">
                        {s.text.slice(0, active ? Math.floor((elapsed - s.start) * TYPE_CPS) : done ? s.text.length : 0)}
                        {active && <span aria-hidden className="mhb-caret ml-px inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-acc" />}
                      </span>
                    </p>
                  </div>
                )}

                {s.kind === "done" && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] border border-acc/30 bg-[linear-gradient(90deg,rgb(185_255_75/0.1),rgb(62_242_196/0.04))] px-3.5 py-3">
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-acc text-[#061006] shadow-[0_0_22px_-2px_var(--color-acc)]",
                        shown && "mhb-pop",
                      )}
                      aria-hidden
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink">
                        Tarefa concluída em <span className="text-acc tabular-nums">{fmtSeconds(timeline.simTotal)}</span>
                      </p>
                      <p className="font-mono text-[11px] text-mute">resumo enviado para {toolLabel(s.tool).toLowerCase()}</p>
                    </div>
                    <ul className="flex w-full flex-wrap gap-1.5">
                      {s.outcomes.map((o) => (
                        <li key={o} className="chip border-acc/30 text-acc">
                          ✓ {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
