import type Lenis from "lenis";
import { labParam } from "./lab";
import { clamp } from "./math";

/** The live Lenis instance (null when reduced motion is on or before mount). */
export const lenisRef: { current: Lenis | null } = { current: null };

/**
 * Progress 0..1 through a tall "pin" wrapper whose sticky child fills the viewport:
 * 0 when the wrapper's top reaches the viewport top, 1 when its bottom reaches the bottom.
 * `?p=` in the URL overrides it.
 */
export function pinProgress(el: HTMLElement): number {
  const forced = labParam("p");
  if (forced !== null) return clamp(forced);
  const r = el.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return total > 0 ? clamp(-r.top / total) : 0;
}

/** 0 when the element's top enters the viewport bottom → 1 when its bottom leaves the top. */
export function viewProgress(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
}

export function isOnScreen(el: HTMLElement, margin = 0): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > -margin && r.top < window.innerHeight + margin;
}
