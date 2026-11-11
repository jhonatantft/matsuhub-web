import type { AuroraUnit } from "@/content/aurora";
import { reducedMotion } from "@/lib/env";
import { lenisRef } from "@/lib/scroll";

/**
 * Tiny event bus between the sections of the Aurora demo page (client only).
 *   unit  → the tour shows that residence on the facade (explorer, Lia)
 *   visit → the visit form is prefilled (unit id and/or a message)
 */
type SiteEvents = {
  unit: AuroraUnit;
  visit: { interest?: string; message?: string };
  /** The tour left or came back to the facade (Lia's button steps aside from the room tabs). */
  tour: "tower" | "plan" | "room";
};

type Listener<K extends keyof SiteEvents> = (payload: SiteEvents[K]) => void;

const listeners: { [K in keyof SiteEvents]: Set<Listener<K>> } = {
  unit: new Set(),
  visit: new Set(),
  tour: new Set(),
};

export function onSite<K extends keyof SiteEvents>(name: K, fn: Listener<K>): () => void {
  listeners[name].add(fn);
  return () => {
    listeners[name].delete(fn);
  };
}

export function emitSite<K extends keyof SiteEvents>(name: K, payload: SiteEvents[K]) {
  for (const fn of listeners[name]) fn(payload);
}

/** Smooth-scroll to a section (respects its scroll-margin-top) or to the top with "top". */
export function scrollToSection(id: string) {
  const lenis = lenisRef.current;
  if (id === "top") {
    if (lenis) lenis.scrollTo(0, { duration: 1.3 });
    else window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.3 });
  else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}

/** Section ids of the page, shared by the header, Lia and the sections. */
export const SECTION = {
  units: "residencias",
  plans: "plantas",
  leisure: "lazer",
  location: "localizacao",
  finance: "financiamento",
  visit: "visita",
} as const;

export const SITE_NAV = [
  { label: "Residências", id: SECTION.units },
  { label: "Plantas", id: SECTION.plans },
  { label: "Lazer", id: SECTION.leisure },
  { label: "Localização", id: SECTION.location },
] as const;
