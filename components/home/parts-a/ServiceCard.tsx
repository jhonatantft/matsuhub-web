"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { coarsePointer, reducedMotion } from "@/lib/env";
import { damp } from "@/lib/math";
import { onFrame } from "@/lib/ticker";

const CSS = `
.sa-card{--mx:50%;--my:30%;transform-style:preserve-3d;will-change:transform;transition:border-color .4s var(--ease-soft),box-shadow .5s var(--ease-soft)}
.sa-card[data-hover="true"]{border-color:rgb(185 255 75/.32);box-shadow:0 40px 120px -60px rgb(185 255 75/.45)}
.sa-spot{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .45s var(--ease-soft);
  background:radial-gradient(520px circle at var(--mx) var(--my),rgb(185 255 75/.13),rgb(62 242 196/.04) 40%,transparent 65%)}
.sa-card[data-hover="true"] .sa-spot{opacity:1}
.sa-beam{position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;opacity:0;transition:opacity .5s var(--ease-soft);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.sa-beam>i{position:absolute;left:50%;top:50%;width:200%;aspect-ratio:1;translate:-50% -50%;
  background:conic-gradient(from 0deg,transparent 0 68%,rgb(62 242 196/.0) 70%,var(--color-acc-2) 82%,var(--color-acc) 88%,transparent 92%);
  animation:sa-spin 4.2s linear infinite;animation-play-state:paused}
.sa-card[data-hover="true"] .sa-beam{opacity:1}
.sa-card[data-hover="true"] .sa-beam>i{animation-play-state:running}
@keyframes sa-spin{to{rotate:360deg}}
.sa-num{color:transparent;-webkit-text-stroke:1px rgb(190 255 215/.22);transition:-webkit-text-stroke-color .5s var(--ease-soft),translate .6s var(--ease-soft)}
.sa-card[data-hover="true"] .sa-num{-webkit-text-stroke-color:rgb(185 255 75/.8);translate:0 -2px}
.sa-stage{background:radial-gradient(60% 70% at 50% 55%,rgb(62 242 196/.07),transparent 70%)}
.sa-stage::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
  background-image:radial-gradient(rgb(190 255 215/.16) 1px,transparent 1.2px);background-size:16px 16px;
  -webkit-mask-image:radial-gradient(70% 75% at 50% 50%,#000,transparent);mask-image:radial-gradient(70% 75% at 50% 50%,#000,transparent)}
.sa-card .sa-chip{transition:border-color .3s,color .3s}
.sa-card[data-hover="true"] .sa-chip{border-color:rgb(185 255 75/.35);color:var(--color-ink)}
@media (prefers-reduced-motion:reduce){.sa-beam>i{animation:none}}
`;

type ServiceCardProps = {
  index: number;
  title: string;
  text: string;
  tags: readonly string[];
  /** Short mono caption shown over the illustration. */
  caption: string;
  className?: string;
  children: React.ReactNode;
};

/** Bento card: cursor spotlight, pointer tilt (desktop), border beam on hover, living illustration on top. */
export function ServiceCard({ index, title, text, tags, caption, className, children }: ServiceCardProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || coarsePointer()) return;
    const still = reducedMotion();
    let tx = 0;
    let ty = 0;
    let rx = 0;
    let ry = 0;
    let hover = false;
    let off: (() => void) | null = null;

    const tick = (_t: number, dt: number) => {
      rx = damp(rx, tx, 7, dt);
      ry = damp(ry, ty, 7, dt);
      if (!hover && Math.abs(rx) < 0.01 && Math.abs(ry) < 0.01) {
        el.style.transform = "";
        off?.();
        off = null;
        return;
      }
      el.style.transform = `perspective(1200px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      tx = -(y / r.height - 0.5) * 5;
      ty = (x / r.width - 0.5) * 6;
      if (!still) off ??= onFrame(tick);
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      hover = true;
      el.dataset.hover = "true";
      move(e);
    };
    const leave = () => {
      hover = false;
      tx = 0;
      ty = 0;
      el.dataset.hover = "false";
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      off?.();
    };
  }, []);

  const n = String(index + 1).padStart(2, "0");
  return (
    <article
      ref={ref}
      data-live-host=""
      data-hover="false"
      className={cn(
        "sa-card card flex h-full min-h-[440px] flex-col bg-bg-2/70 md:min-h-[480px]",
        className,
      )}
    >
      <style href="sa-service-card" precedence="default">
        {CSS}
      </style>
      <div className="sa-spot" aria-hidden />
      <div className="sa-beam" aria-hidden>
        <i />
      </div>

      <div className="sa-stage relative h-[230px] shrink-0 overflow-hidden md:h-[270px]">
        <span
          aria-hidden
          className="sa-num pointer-events-none absolute top-5 left-6 font-display text-[64px] leading-none font-bold tracking-[-0.05em] md:top-6 md:left-7 md:text-[84px]"
        >
          {n}
        </span>
        <div className="absolute inset-0">{children}</div>
        <span
          aria-hidden
          className="absolute top-6 right-6 font-mono text-[10px] tracking-[0.18em] text-dim uppercase md:top-7 md:right-7"
        >
          {caption}
        </span>
      </div>

      <div className="relative mt-auto px-6 pb-7 md:px-8 md:pb-8">
        <h3 className="h-card mb-2.5">{title}</h3>
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-mute">{text}</p>
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Tecnologias">
          {tags.map((t) => (
            <li key={t} className="sa-chip chip">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
