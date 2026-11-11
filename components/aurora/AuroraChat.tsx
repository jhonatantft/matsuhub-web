"use client";

import { useEffect, useState } from "react";
import { LIA } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";

export type AuroraChatMessage = { from: "lia" | "user"; text: string };

export type AuroraChatProps = {
  /** Slides the bubble in and plays the script; closing it rewinds. */
  open: boolean;
  /** Defaults to the three-line script of the homepage showcase (LIA.showcase). */
  messages?: readonly AuroraChatMessage[];
  /** Seconds between two messages. */
  pace?: number;
  className?: string;
};

/**
 * Lia's chat bubble: a scripted exchange that types itself out (a simulation, not a live
 * model — the label says so). Wide containers: a floating widget, bottom right. Narrow ones:
 * a bottom sheet. Presentational; the full demo page has its own, interactive Lia.
 */
export function AuroraChat({ open, messages = LIA.showcase, pace = 1.25, className }: AuroraChatProps) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    const at = (seconds: number, fn: () => void) => timers.push(window.setTimeout(fn, seconds * 1000));
    if (!open) {
      at(0.45, () => {
        setShown(0);
        setTyping(false);
      });
    } else if (reducedMotion()) {
      at(0, () => setShown(messages.length));
    } else {
      let t = 0.55;
      messages.forEach((message, i) => {
        if (message.from === "lia") {
          at(t, () => setTyping(true));
          t += pace * 0.8;
        } else {
          t += pace * 0.55;
        }
        at(t, () => {
          setTyping(false);
          setShown(i + 1);
        });
        t += pace * 0.35;
      });
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [open, messages, pace]);

  return (
    <div
      data-open={open}
      aria-hidden={!open || undefined}
      className={cn(
        "absolute z-[5] flex flex-col border border-au-line bg-au-bg/88 text-au-ink shadow-[0_30px_80px_-24px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-[opacity,translate] duration-600 ease-soft data-[open=false]:pointer-events-none data-[open=false]:translate-y-6 data-[open=false]:opacity-0 @max-xl:inset-x-2.5 @max-xl:bottom-2.5 @xl:right-6 @xl:bottom-[84px] @xl:w-[304px]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-au-line px-4 py-3">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-au-gold/70 font-aurora text-[17px] leading-none text-au-gold">
          L
          <i aria-hidden className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-au-bg bg-[#7fe3a3]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2.5">
            <span className="font-aurora text-[17px] leading-none">{LIA.name}</span>
            <span className="border border-au-line px-1.5 py-[3px] text-[7.5px] leading-none font-bold tracking-[0.2em] text-au-gold uppercase">
              Simulação
            </span>
          </span>
          <span className="mt-1.5 block truncate text-[8.5px] leading-none font-semibold tracking-[0.2em] text-au-mute uppercase">
            {LIA.role}
          </span>
        </span>
      </div>

      <div className="flex min-h-[172px] flex-col justify-end gap-2 px-3.5 py-3.5" aria-live="off">
        {messages.slice(0, shown).map((message, i) => (
          <p
            key={i}
            className={cn(
              "max-w-[86%] px-3 py-2 text-[12.5px] leading-snug transition-[opacity,translate,scale] duration-500 ease-soft starting:translate-y-2 starting:scale-95 starting:opacity-0",
              message.from === "user"
                ? "origin-bottom-right self-end rounded-[14px_14px_3px_14px] bg-au-gold font-medium text-au-bg"
                : "origin-bottom-left self-start rounded-[14px_14px_14px_3px] bg-white/[0.09]",
            )}
          >
            {message.text}
          </p>
        ))}
        {typing && (
          <p
            aria-hidden
            className="flex gap-1 self-start rounded-[14px_14px_14px_3px] bg-white/[0.09] px-3 py-3 transition-opacity duration-300 starting:opacity-0"
          >
            {[0, 1, 2].map((dot) => (
              <i
                key={dot}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-au-mute [animation-duration:0.9s]"
                style={{ animationDelay: `${dot * 0.14}s` }}
              />
            ))}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-au-line px-4 py-3 text-[12px] text-au-mute">
        <span>Escreva uma mensagem…</span>
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-au-gold text-[13px] text-au-bg">
          ↑
        </span>
      </div>
    </div>
  );
}
