"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

type Item = { q: string; a: string };

/**
 * Accessible accordion (WAI-ARIA pattern): each question is a button in a heading, with
 * aria-expanded/aria-controls; answers stay in the DOM (for search engines) but are inert while
 * closed. Several can be open at once.
 */
export function SegmentFaq({ items }: { items: Item[] }) {
  const base = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="border-t border-line">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const button = `${base}-q${i}`;
        const panel = `${base}-a${i}`;
        return (
          <div key={item.q} className="border-b border-line">
            <h3>
              <button
                type="button"
                id={button}
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => toggle(i)}
                className="group flex w-full items-center gap-5 py-5 text-left transition-colors hover:text-acc focus-visible:outline-offset-[-2px] sm:py-6"
              >
                <span className="font-mono text-[11px] text-dim">0{i + 1}</span>
                <span className="flex-1 text-[clamp(16px,1.4vw,19px)] leading-snug font-semibold">{item.q}</span>
                <span
                  aria-hidden
                  className={cn(
                    "relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-[border-color,background-color,rotate] duration-500 ease-soft",
                    isOpen ? "rotate-45 border-acc bg-acc/10 text-acc" : "border-line-2 text-mute group-hover:border-acc/60",
                  )}
                >
                  <i className="absolute h-px w-3.5 bg-current" />
                  <i className="absolute h-3.5 w-px bg-current" />
                </span>
              </button>
            </h3>
            <div
              id={panel}
              role="region"
              aria-labelledby={button}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-soft",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-[68ch] pr-2 pb-6 pl-[calc(11px*1.6+20px)] sm:pr-12 text-[15.5px] leading-relaxed text-mute">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
