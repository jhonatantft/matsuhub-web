"use client";

import { useEffect, useRef } from "react";

let io: IntersectionObserver | null = null;

/** One shared observer for every <Reveal>; marks the element with data-in="true" once it is seen. */
function observer() {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.in = "true";
        io?.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  return io;
}

type RevealProps = {
  as?: keyof React.JSX.IntrinsicElements;
  /** Seconds to wait after entering the viewport (stagger siblings with 0, .08, .16…). */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  children?: React.ReactNode;
};

/** Fades and slides its content in the first time it scrolls into view. CSS lives in globals.css ([data-reveal]). */
export function Reveal({ as = "div", delay = 0, className, style, id, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    observer().observe(el);
    return () => io?.unobserve(el);
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      data-reveal=""
      style={delay ? ({ ...style, "--reveal-delay": `${delay}s` } as React.CSSProperties) : style}
    >
      {children}
    </Tag>
  );
}
