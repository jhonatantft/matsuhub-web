"use client";

import { useEffect, useRef } from "react";
import { PROCESS } from "@/content/site";
import { reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp, damp } from "@/lib/math";
import { onFrame } from "@/lib/ticker";

const DELIVERABLES: Record<(typeof PROCESS)[number]["n"], string[]> = {
  "01": ["Mapa de oportunidades", "Escopo e prazo"],
  "02": ["Protótipo navegável"],
  "03": ["Deploy contínuo", "Demo a cada sprint"],
  "04": ["Painel de métricas", "Ciclos de melhoria"],
};

const CSS = `
.sa-step{--on:0}
.sa-step .sa-node{background:var(--color-bg);border-color:var(--color-line-2);transition:background-color .5s,border-color .5s,box-shadow .6s var(--ease-soft),scale .6s var(--ease-soft)}
.sa-step[data-on="true"] .sa-node{background:var(--color-acc);border-color:var(--color-acc);box-shadow:0 0 0 6px rgb(185 255 75/.12),0 0 24px rgb(185 255 75/.7);scale:1.15}
.sa-step .sa-idx{color:var(--color-dim);transition:color .5s}
.sa-step[data-on="true"] .sa-idx{color:var(--color-acc)}
.sa-step .sa-body{opacity:.38;translate:0 10px;transition:opacity .7s var(--ease-soft),translate .7s var(--ease-soft)}
.sa-step[data-on="true"] .sa-body{opacity:1;translate:0 0}
.sa-step .sa-chip2{transition:border-color .6s,color .6s}
.sa-step[data-on="true"] .sa-chip2{border-color:rgb(185 255 75/.35);color:var(--color-ink)}
.sa-fill{transform-origin:top;transform:scaleY(var(--p,0));background:linear-gradient(180deg,var(--color-acc),var(--color-acc-2))}
.sa-head{transform:translateY(calc(var(--p,0)*100%))}
@media (min-width:768px){
  .sa-fill{transform-origin:left;transform:scaleX(var(--p,0));background:linear-gradient(90deg,var(--color-acc),var(--color-acc-2))}
  .sa-head{transform:translateX(calc(var(--p,0)*100%))}
}
.sa-head-dot{box-shadow:0 0 0 4px rgb(185 255 75/.15),0 0 18px 4px rgb(185 255 75/.75),0 0 60px 10px rgb(62 242 196/.35)}
`;

/** Four steps on a line that draws itself with scroll (horizontal on desktop, vertical on mobile). */
export function ProcessLine() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = ref.current;
    const track = list?.querySelector<HTMLElement>("[data-track]");
    if (!list || !track) return;
    const steps = Array.from(list.querySelectorAll<HTMLElement>("[data-step]"));
    const thresholds = new Float32Array(steps.length);
    const mq = window.matchMedia("(min-width: 768px)");
    let wide = mq.matches;

    const measure = () => {
      wide = mq.matches;
      const t = track.getBoundingClientRect();
      steps.forEach((s, i) => {
        const node = s.querySelector<HTMLElement>("[data-node]") ?? s;
        const r = node.getBoundingClientRect();
        thresholds[i] = wide
          ? (r.left + r.width / 2 - t.left) / Math.max(1, t.width)
          : (r.top + r.height / 2 - t.top) / Math.max(1, t.height);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);

    const forced = labParam("p");
    const instant = reducedMotion();
    let p = 0;
    const on = new Array<boolean>(steps.length).fill(false);

    const target = () => {
      if (forced !== null) return clamp(forced);
      const r = track.getBoundingClientRect();
      const vh = window.innerHeight;
      return wide
        ? clamp((vh * 0.88 - r.top) / (vh * 0.5))
        : clamp((vh * 0.62 - r.top) / Math.max(1, r.height));
    };

    const apply = (dt: number) => {
      const t = target();
      p = instant || dt >= 1 ? t : damp(p, t, 5, dt);
      list.style.setProperty("--p", p.toFixed(4));
      for (let i = 0; i < steps.length; i++) {
        const lit = p > 0.001 && p >= thresholds[i] - 0.005;
        if (lit !== on[i]) {
          on[i] = lit;
          steps[i].dataset.on = String(lit);
        }
      }
    };

    let off: (() => void) | null = null;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) off ??= onFrame((_t, dt) => apply(dt));
        else {
          apply(1);
          off?.();
          off = null;
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(list);
    return () => {
      io.disconnect();
      ro.disconnect();
      off?.();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative mt-[clamp(44px,6vw,80px)] pl-10 md:pt-12 md:pl-0"
    >
      <style href="sa-process" precedence="default">
        {CSS}
      </style>
      <div
        data-track
        aria-hidden
        className="absolute top-2 bottom-2 left-[7px] w-px bg-line md:top-[7px] md:right-0 md:bottom-auto md:left-0 md:h-px md:w-auto"
      >
        <div className="sa-fill absolute -inset-[0.75px] rounded-full shadow-[0_0_16px_rgb(185_255_75/.7)]" />
        <div className="sa-head absolute inset-0">
          <span className="sa-head-dot absolute top-0 left-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4ffe0]" />
        </div>
      </div>

      <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
        {PROCESS.map((s) => (
          <li key={s.n} data-step data-on="false" className="sa-step relative">
            <span
              data-node
              aria-hidden
              className="sa-node absolute top-[6px] -left-10 h-[15px] w-[15px] -translate-x-0 rounded-full border md:-top-12 md:left-0"
            />
            <div className="sa-body">
              <p className="sa-idx font-mono text-[12px] tracking-[0.16em]">
                {s.n} / 04
              </p>
              <h3 className="mt-2.5 mb-2 font-display text-[clamp(19px,1.6vw,22px)] font-semibold tracking-[-0.02em]">
                {s.title}
              </h3>
              <p className="max-w-[34ch] text-[15px] leading-relaxed text-mute">
                {s.text}
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Entregas">
                {DELIVERABLES[s.n].map((d) => (
                  <li key={d} className="sa-chip2 chip">
                    <span aria-hidden className="text-acc">
                      ↳
                    </span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
