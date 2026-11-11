import { reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { damp, easeOutCubic } from "@/lib/math";
import { onFrame } from "@/lib/ticker";

/**
 * State handed to an illustration's draw function every frame.
 * - clock: its own time in seconds; runs faster while `energy` is high.
 * - energy: ~0.35 idle, 1 while its card is hovered (and right after it first enters the view).
 * - intro: 0 → 1 over the first 1.4 s the illustration is on screen.
 */
export type LiveState = { clock: number; energy: number; intro: number };

type LiveOptions = {
  /** Resting energy level (default 0.35). */
  idle?: number;
  /** Clock value used for the single still frame under prefers-reduced-motion. */
  still?: number;
};

/**
 * Drives an illustration from the shared ticker while it is on screen.
 * Hover is read from the closest `[data-live-host]` ancestor (`data-hover="true"`).
 * Call it inside an effect; returns the cleanup.
 */
export function startLive(el: Element, draw: (s: LiveState) => void, opts: LiveOptions = {}): () => void {
  const idle = opts.idle ?? 0.35;
  const host = el.closest<HTMLElement>("[data-live-host]");
  const s: LiveState = { clock: 0, energy: 1, intro: 0 };

  if (reducedMotion()) {
    s.clock = opts.still ?? 2.4;
    s.energy = idle;
    s.intro = 1;
    draw(s);
    return () => {};
  }

  draw(s);
  const forced = labParam("t");
  let introStart = -1;
  let off: (() => void) | null = null;

  const tick = (time: number, dt: number) => {
    const hot = host?.dataset.hover === "true";
    if (forced !== null) {
      s.intro = 1;
      s.energy = hot ? 1 : idle;
      s.clock = time;
      draw(s);
      return;
    }
    if (introStart < 0) introStart = time;
    s.intro = easeOutCubic((time - introStart) / 1.4);
    s.energy = damp(s.energy, hot ? 1 : idle, hot ? 5 : 1.4, dt);
    s.clock += dt * s.energy;
    draw(s);
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) off ??= onFrame(tick);
      else {
        off?.();
        off = null;
      }
    },
    { rootMargin: "60px" },
  );
  io.observe(el);
  return () => {
    io.disconnect();
    off?.();
  };
}

/** Evenly spaced points along an SVG path, measured once so the frame loop never calls getPointAtLength. */
export function samplePath(path: SVGPathElement, count = 96): Float32Array {
  const len = path.getTotalLength();
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const p = path.getPointAtLength((len * i) / (count - 1));
    out[i * 2] = p.x;
    out[i * 2 + 1] = p.y;
  }
  return out;
}

/** Position at 0..1 along samples from samplePath (linear between samples). Writes into `out`. */
export function pointAt(samples: Float32Array, t: number, out: { x: number; y: number }) {
  const n = samples.length / 2 - 1;
  const f = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(Math.floor(f), n - 1);
  const k = f - i;
  out.x = samples[i * 2] + (samples[i * 2 + 2] - samples[i * 2]) * k;
  out.y = samples[i * 2 + 1] + (samples[i * 2 + 3] - samples[i * 2 + 1]) * k;
  return out;
}

export const fract = (v: number) => v - Math.floor(v);
