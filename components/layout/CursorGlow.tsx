"use client";

import { useEffect, useRef } from "react";
import { coarsePointer, reducedMotion } from "@/lib/env";
import { damp } from "@/lib/math";
import { onFrame } from "@/lib/ticker";

/** Soft lime light that trails the pointer (desktop only). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || coarsePointer() || reducedMotion()) return;
    let tx = window.innerWidth * 0.7;
    let ty = window.innerHeight * 0.4;
    let x = tx;
    let y = ty;
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    window.addEventListener("pointermove", move, { passive: true });
    el.style.opacity = "1";
    const off = onFrame((_, dt) => {
      x = damp(x, tx, 7, dt);
      y = damp(y, ty, 7, dt);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    return () => {
      off();
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[1] -m-[310px] h-[620px] w-[620px] rounded-full opacity-0 transition-opacity duration-700 will-change-transform"
      style={{ background: "radial-gradient(closest-side, rgb(185 255 75 / 0.09), transparent)" }}
    />
  );
}
