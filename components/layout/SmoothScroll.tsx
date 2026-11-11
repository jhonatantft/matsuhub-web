"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { lenisRef } from "@/lib/scroll";
import { onFrame } from "@/lib/ticker";

/** Smooth wheel scrolling (Lenis) driven by the shared ticker. Native scroll under reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    const jump = labParam("y");
    if (reducedMotion()) {
      if (jump !== null) window.scrollTo(0, jump);
      return;
    }
    const lenis = new Lenis({ lerp: 0.11, anchors: true });
    lenisRef.current = lenis;
    const off = onFrame(() => lenis.raf(performance.now()));
    if (jump !== null) lenis.scrollTo(jump, { immediate: true, force: true });
    return () => {
      off();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);
  return null;
}
