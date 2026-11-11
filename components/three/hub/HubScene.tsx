"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { mountHub } from "./engine";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function onReducedMotionChange(notify: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/**
 * The hero's WebGL scene: "the hub", a living core of light where AI agents work.
 * Purely decorative — it fills its (positioned) parent, ignores pointer events and is hidden
 * from assistive tech. All the work happens in ./engine, outside React.
 */
export default function HubScene({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // The engine reads the motion preference when it mounts; remount it if the user flips the
  // setting while the page is open, so the still frame takes over (or gives way) right away.
  const reduced = useSyncExternalStore(
    onReducedMotionChange,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return mountHub(el);
  }, [reduced]);

  return <div ref={ref} aria-hidden className={cn("pointer-events-none relative", className)} />;
}
