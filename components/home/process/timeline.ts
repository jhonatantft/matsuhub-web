import { clamp } from "@/lib/math";

/** Seconds each phase plays on the stage (each one ends with a short hold on its finished state). */
export const DUR = [8.5, 8.5, 16, 9.5] as const;
export const TOTAL = DUR.reduce((a, b) => a + b, 0);

/** Construção runs the feedback loop twice; each cycle is CYCLE seconds. */
export const CYCLE = 8;
/** Loop step boundaries inside a cycle: construir | mostrar | ouvir | ajustar. */
export const LOOP_AT = [0, 1.8, 3.0, 5.0, CYCLE] as const;
/** Inside "ajustar": the change animates, the pin turns into a check, the version is published. */
export const FIX = { start: 5.3, end: 6.2, check: 6.3, publish: 6.7 } as const;

/** Which loop step (0..3) a time inside a cycle falls into, and how far along that step it is. */
export function loopStep(local: number) {
  for (let i = 0; i < 4; i++) {
    if (local < LOOP_AT[i + 1]) return { step: i, p: clamp((local - LOOP_AT[i]) / (LOOP_AT[i + 1] - LOOP_AT[i])) };
  }
  return { step: 3, p: 1 };
}

/** A phase position on the full looping timeline. */
export function locate(time: number) {
  let t = ((time % TOTAL) + TOTAL) % TOTAL;
  for (let i = 0; i < DUR.length; i++) {
    if (t < DUR[i]) return { phase: i, t };
    t -= DUR[i];
  }
  return { phase: DUR.length - 1, t: DUR[DUR.length - 1] };
}

/** Typewriter: the first `p` share of `text`. */
export const typed = (text: string, p: number) => text.slice(0, Math.round(text.length * clamp(p)));
