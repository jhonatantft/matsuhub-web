/** Client-side capability checks. Call them inside effects/handlers, never during render. */

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const coarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export type Quality = "low" | "mid" | "high";

/** Rough device tier for WebGL budgets (particle counts, DPR, post-processing). */
export function quality(): Quality {
  if (typeof window === "undefined") return "mid";
  const mobile = coarsePointer() || window.innerWidth < 760;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (mobile) return cores >= 6 && mem >= 4 ? "mid" : "low";
  return cores >= 8 ? "high" : "mid";
}

export const maxDpr = (q: Quality) =>
  Math.min(window.devicePixelRatio || 1, q === "high" ? 2 : q === "mid" ? 1.5 : 1.25);
