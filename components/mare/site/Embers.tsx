"use client";

import { useEffect, useRef } from "react";
import { coarsePointer, maxDpr, quality, reducedMotion } from "@/lib/env";
import { isOnScreen } from "@/lib/scroll";
import { onFrame } from "@/lib/ticker";

/**
 * Embers rising from the bottom of the parent, drawn on a 2D canvas through lib/ticker.
 * The pointer pushes them aside and fans them brighter. Nothing at all under reduced motion.
 * Particles live in one Float32Array (no allocations per frame).
 */
const STRIDE = 7; // x, y, vx, vy, life, max life, size

export function Embers({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx || reducedMotion()) return;

    const q = quality();
    const count = q === "low" ? 38 : q === "mid" ? 60 : 90;
    const dpr = maxDpr(q);
    const p = new Float32Array(count * STRIDE);
    let w = 1;
    let h = 1;
    const pointer = { x: -9999, y: -9999, on: false };

    const spawn = (i: number, anywhere: boolean) => {
      const o = i * STRIDE;
      p[o] = Math.random() * w;
      p[o + 1] = anywhere ? h * (0.35 + Math.random() * 0.65) : h + Math.random() * 30;
      p[o + 2] = (Math.random() - 0.5) * 12;
      p[o + 3] = -(26 + Math.random() * 46);
      p[o + 5] = 3.5 + Math.random() * 5;
      p[o + 4] = anywhere ? Math.random() * p[o + 5] : 0;
      p[o + 6] = 0.7 + Math.random() * 1.9;
    };

    const size = () => {
      const r = parent.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    for (let i = 0; i < count; i++) spawn(i, true);
    const ro = new ResizeObserver(size);
    ro.observe(parent);

    const move = (event: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = event.clientX - r.left;
      pointer.y = event.clientY - r.top;
      pointer.on = true;
    };
    const leave = () => {
      pointer.on = false;
      pointer.x = pointer.y = -9999;
    };
    const touch = coarsePointer();
    parent.addEventListener("pointermove", move, { passive: true });
    parent.addEventListener("pointerleave", leave);
    if (touch) parent.addEventListener("pointerup", leave);

    const off = onFrame((time, dt) => {
      if (document.hidden || !isOnScreen(canvas, 80)) return;
      const step = Math.min(dt, 0.05);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const radius = Math.min(220, w * 0.3);
      for (let i = 0; i < count; i++) {
        const o = i * STRIDE;
        p[o + 4] += step;
        if (p[o + 4] > p[o + 5] || p[o + 1] < -20) {
          spawn(i, false);
          continue;
        }
        // sway + pointer: push away from the cursor, a little upward lift
        let ax = Math.sin(time * 1.3 + i * 1.7) * 9;
        let ay = 0;
        let glow = 0;
        if (pointer.on) {
          const dx = p[o] - pointer.x;
          const dy = p[o + 1] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2) || 1;
            const f = 1 - d / radius;
            ax += (dx / d) * f * 420;
            ay += (dy / d) * f * 260 - f * 120;
            glow = f;
          }
        }
        p[o + 2] = (p[o + 2] + ax * step) * (1 - 1.6 * step);
        p[o + 3] = (p[o + 3] + ay * step) * (1 - 0.6 * step) - 14 * step;
        p[o] += p[o + 2] * step;
        p[o + 1] += p[o + 3] * step;

        const life = p[o + 4] / p[o + 5];
        const alpha = Math.min(1, life * 6) * (1 - life) * (0.55 + glow * 0.45);
        const s = p[o + 6] * (1 + glow * 0.8);
        const flicker = 0.75 + 0.25 * Math.sin(time * 14 + i * 3.1);
        ctx.fillStyle = `rgba(255, ${Math.round(150 + 70 * (1 - life))}, ${Math.round(70 + 40 * glow)}, ${alpha * flicker})`;
        ctx.beginPath();
        ctx.arc(p[o], p[o + 1], s * 2.6, 0, Math.PI * 2);
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p[o], p[o + 1], s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    });

    return () => {
      off();
      ro.disconnect();
      parent.removeEventListener("pointermove", move);
      parent.removeEventListener("pointerleave", leave);
      parent.removeEventListener("pointerup", leave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
