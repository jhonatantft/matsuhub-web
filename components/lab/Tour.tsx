"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The self-driving tour of a Lab experiment: a drawn cursor travels to a control marked
 * `data-tour="<id>"`, presses it (calls `run`), waits `hold` seconds, moves on, and loops.
 * Any press, key or input inside the experiment hands control to the visitor; 25 s of quiet
 * gives it back. Runs only while the experiment is on screen; never with reduced motion.
 */
export type TourStep = { target: string; run(): void; hold: number };

const IDLE_MS = 25000;
const TRAVEL_MS = 900;

export function useTour(steps: readonly TourStep[], enabled: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef(steps);
  const [touring, setTouring] = useState(false);

  useEffect(() => {
    stepsRef.current = steps;
  });

  useEffect(() => {
    const root = rootRef.current;
    const cursor = cursorRef.current;
    if (!enabled || !root || !cursor) return;
    let index = 0;
    let running = false;
    let visible = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let press: ReturnType<typeof setTimeout> | undefined;

    const step = () => {
      if (!running) return;
      if (!visible) {
        timer = setTimeout(step, 600);
        return;
      }
      const list = stepsRef.current;
      const s = list[index % list.length];
      const el = root.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
      if (!el) {
        index++;
        timer = setTimeout(step, 100);
        return;
      }
      const r = root.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      cursor.style.transform = `translate3d(${(b.left - r.left + b.width * 0.6).toFixed(0)}px,${(b.top - r.top + b.height * 0.62).toFixed(0)}px,0)`;
      cursor.dataset.show = "1";
      timer = setTimeout(() => {
        if (!running) return;
        cursor.dataset.press = "1";
        clearTimeout(press);
        press = setTimeout(() => (cursor.dataset.press = ""), 280);
        s.run();
        index++;
        timer = setTimeout(step, s.hold * 1000);
      }, TRAVEL_MS);
    };
    const start = () => {
      if (running) return;
      running = true;
      setTouring(true);
      step();
    };
    const halt = () => {
      clearTimeout(idle);
      idle = setTimeout(start, IDLE_MS);
      if (!running) return;
      running = false;
      clearTimeout(timer);
      cursor.dataset.show = "";
      setTouring(false);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !started) {
        started = true;
        timer = setTimeout(start, 900);
      }
    });
    io.observe(root);
    root.addEventListener("pointerdown", halt);
    root.addEventListener("keydown", halt);
    root.addEventListener("input", halt);
    return () => {
      running = false;
      clearTimeout(timer);
      clearTimeout(idle);
      clearTimeout(press);
      io.disconnect();
      root.removeEventListener("pointerdown", halt);
      root.removeEventListener("keydown", halt);
      root.removeEventListener("input", halt);
    };
  }, [enabled]);

  return { rootRef, cursorRef, touring };
}

/** The drawn pointer the tour moves around. Place it inside the tour root (position: relative). */
export function TourCursor({ cursorRef }: { cursorRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={cursorRef}
      aria-hidden
      className="group pointer-events-none absolute top-0 left-0 z-30 opacity-0 transition-[transform,opacity] duration-[900ms] ease-soft data-[show=1]:opacity-100"
    >
      <span className="absolute -top-4 -left-4 h-8 w-8 scale-50 rounded-full border border-acc opacity-0 transition-[transform,opacity] duration-300 group-data-[press=1]:scale-125 group-data-[press=1]:opacity-100" />
      <svg viewBox="0 0 20 24" className="h-6 w-5 drop-shadow-[0_2px_8px_rgb(0_0_0/0.6)]">
        <path d="M2 2v17l4.6-4.3 3.1 7 3-1.3-3-6.9H16L2 2Z" fill="#eef4ee" stroke="#050807" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
