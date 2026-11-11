"use client";

import { useEffect } from "react";
import { labParam } from "@/lib/lab";
import { lenisRef } from "@/lib/scroll";

/**
 * Dev-only: makes /lab/showcase deterministic for screenshots.
 *   ?p=0.45  scroll to where the pinned showcase is at that progress (the scene is forced to it too)
 *   ?s=1     scroll to the interactive tour, ?s=2 to the stage bench
 */
export function LabJump() {
  useEffect(() => {
    const p = labParam("p");
    const s = labParam("s");
    let top: number | null = null;
    if (s !== null) {
      const el = document.getElementById(s === 1 ? "lab-tour" : "lab-stage");
      if (el) top = el.getBoundingClientRect().top + window.scrollY;
    } else if (p !== null) {
      const pin = document.querySelector<HTMLElement>("#demos .sticky")?.parentElement;
      if (pin) top = pin.getBoundingClientRect().top + window.scrollY + p * (pin.offsetHeight - window.innerHeight);
    }
    if (top === null) return;
    if (lenisRef.current) lenisRef.current.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo(0, top);
  }, []);
  return null;
}
