"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";

const GLYPHS = "01<>/#_";

type LabelProps = {
  as?: "p" | "span" | "div";
  /** Blinking status dot before the text. */
  dot?: boolean;
  /** "Decode" the text character by character the first time it is seen. */
  scramble?: boolean;
  className?: string;
  children: string;
};

/** Mono, uppercase section label — the site's small recurring signature. */
export function Label({ as = "p", dot = false, scramble = true, className, children }: LabelProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    const node = el?.querySelector("[data-text]")?.firstChild;
    if (!el || !node || !scramble || reducedMotion()) return;
    let frame = 0;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timer = window.setInterval(() => {
          node.nodeValue = Array.from(children, (c, i) =>
            i < frame || c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0],
          ).join("");
          if (++frame > children.length) window.clearInterval(timer);
        }, 30);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
      node.nodeValue = children;
    };
  }, [children, scramble]);

  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={cn("label flex items-center gap-2.5", className)}>
      {dot && (
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 animate-blink rounded-full bg-acc shadow-[0_0_12px_var(--color-acc)]"
        />
      )}
      <span data-text>{children}</span>
    </Tag>
  );
}
