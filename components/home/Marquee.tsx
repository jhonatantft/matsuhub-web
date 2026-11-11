"use client";

import { useEffect, useRef } from "react";
import { MARQUEE, SERVICES } from "@/content/site";
import { reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp, damp } from "@/lib/math";
import { onFrame } from "@/lib/ticker";

/** Secondary mono row: the stack behind the capabilities. */
const STACK = [...new Set(SERVICES.flatMap((s) => s.tags))];

const COPIES = 3;

function Star() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-[0.45em] h-[0.42em] w-[0.42em] shrink-0 text-acc drop-shadow-[0_0_10px_rgb(185_255_75/0.7)]"
      aria-hidden
    >
      <path d="M12 0c.7 6.6 4.7 10.9 12 12-7.3 1.1-11.3 5.4-12 12-.7-6.6-4.7-10.9-12-12C7.3 10.9 11.3 6.6 12 0Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Capability band between the hero and Services. Drifts on its own and reacts to scroll:
 * faster and slightly skewed while the page moves, direction following the scroll.
 */
export function Marquee() {
  const rootRef = useRef<HTMLElement>(null);
  const bigRef = useRef<HTMLDivElement>(null);
  const smallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const big = bigRef.current;
    const small = smallRef.current;
    if (!root || !big || !small) return;

    let wBig = 1;
    let wSmall = 1;
    const measure = () => {
      wBig = (big.firstElementChild as HTMLElement | null)?.offsetWidth || 1;
      wSmall = (small.firstElementChild as HTMLElement | null)?.offsetWidth || 1;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(big);
    ro.observe(small);

    if (reducedMotion()) return () => ro.disconnect();

    const forced = labParam("t");
    let xBig = 0;
    let xSmall = 0;
    let vel = 0; // smoothed scroll velocity, px/s
    let skew = 0;
    let dir = 1;
    let lastY = -1;
    let off: (() => void) | null = null;

    const tick = (time: number, dt: number) => {
      if (forced !== null) {
        xBig = -((time * 70) % wBig);
        xSmall = -wSmall + ((time * 45) % wSmall);
        big.style.transform = `translate3d(${xBig}px,0,0)`;
        small.style.transform = `translate3d(${xSmall}px,0,0)`;
        return;
      }
      const y = window.scrollY;
      const raw = lastY < 0 ? 0 : (y - lastY) / dt;
      lastY = y;
      vel = damp(vel, clamp(raw, -6000, 6000), 6, dt);
      if (Math.abs(vel) > 8) dir = Math.sign(vel);
      skew = damp(skew, clamp(-vel * 0.0035, -9, 9), 8, dt);
      const boost = Math.min(Math.abs(vel) * 0.55, 1400);

      xBig -= (70 + boost) * dir * dt;
      xSmall += (45 + boost * 0.6) * dir * dt;
      xBig = ((xBig % wBig) - wBig) % wBig;
      xSmall = ((xSmall % wSmall) - wSmall) % wSmall;
      big.style.transform = `translate3d(${xBig}px,0,0) skewX(${skew}deg)`;
      small.style.transform = `translate3d(${xSmall}px,0,0) skewX(${skew * 0.6}deg)`;
    };

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        lastY = -1;
        off ??= onFrame(tick);
      } else {
        off?.();
        off = null;
      }
    });
    io.observe(root);
    return () => {
      io.disconnect();
      ro.disconnect();
      off?.();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      aria-label="O que fazemos"
      className="relative z-[2] overflow-hidden border-y border-line bg-bg [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]"
    >
      <p className="sr-only">{MARQUEE.join(", ")}</p>
      <div aria-hidden className="py-[clamp(18px,2.4vw,30px)]">
        <div ref={bigRef} className="flex w-max will-change-transform">
          {Array.from({ length: COPIES }, (_, c) => (
            <div key={c} className="flex shrink-0 items-center">
              {MARQUEE.map((item, i) => (
                <span key={item} className="flex items-center">
                  <span
                    className={
                      "whitespace-nowrap font-display text-[clamp(30px,5.4vw,78px)] font-bold uppercase leading-none tracking-[-0.03em] " +
                      (i % 2 === 0
                        ? "text-transparent [-webkit-text-stroke:1.2px_rgb(238_244_238/0.55)]"
                        : "text-acc [text-shadow:0_0_40px_rgb(185_255_75/0.35)]")
                    }
                  >
                    {item}
                  </span>
                  <Star />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="border-t border-line bg-bg-2/60 py-2.5">
        <div ref={smallRef} className="flex w-max will-change-transform">
          {Array.from({ length: COPIES }, (_, c) => (
            <div key={c} className="flex shrink-0 items-center">
              {STACK.map((item) => (
                <span
                  key={item}
                  className="flex items-center whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-dim"
                >
                  <span className="px-5">{item}</span>
                  <span className="h-1 w-1 rounded-full bg-acc-2/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
