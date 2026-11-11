"use client";

import { useLayoutEffect, useRef } from "react";
import { reducedMotion } from "@/lib/env";

/**
 * FLIP re-ordering for a list: children marked [data-flip="<id>"] glide from their previous
 * position to the new one whenever `signature` changes. Uses the Web Animations API (no rAF loop).
 */
export function useFlip<T extends HTMLElement>(signature: string) {
  const ref = useRef<T>(null);
  const last = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-flip]"));
    const next = new Map<string, DOMRect>();
    const still = reducedMotion();
    const base = root.getBoundingClientRect();
    for (const el of nodes) {
      const id = el.dataset.flip!;
      const r = el.getBoundingClientRect();
      // relative to the list, so a page scroll between two renders is not read as movement
      const rect = new DOMRect(r.left - base.left, r.top - base.top, r.width, r.height);
      next.set(id, rect);
      const prev = last.current.get(id);
      if (still) continue;
      if (!prev) {
        el.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
        continue;
      }
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    last.current = next;
  }, [signature]);

  return ref;
}
