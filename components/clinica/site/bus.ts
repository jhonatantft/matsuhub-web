import { useSyncExternalStore } from "react";
import type { EloMode, EloRoomId, EloSpecialtyId } from "@/content/clinica";
import { reducedMotion } from "@/lib/env";
import { lenisRef } from "@/lib/scroll";

/**
 * Wiring of the Elo clinic demo page (client only).
 *
 * 1. The tour (components/clinica/tour) talks through window CustomEvents:
 *      tour → page   elo:state     { state: "fachada" | "planta" | "sala", room? }
 *                    elo:book      { specialty, professionalId?, start?: ISO }
 *      page → tour   elo:show-room { room }
 * 2. The sections talk through a tiny in-memory bus: prefill the booking (cards, exams, Iris) and
 *    announce a confirmed booking (Iris offers it for "remarcar", the pre-consultation prints it).
 * 3. One shared clock (useNow) read in a subscription, never during render.
 */

export type TourState = "fachada" | "planta" | "sala";
export type TourStateDetail = { state: TourState; room?: EloRoomId };
export type TourBookDetail = { specialty: EloSpecialtyId; professionalId?: string; start?: string };

export function onTour(name: "elo:state", fn: (detail: TourStateDetail) => void): () => void;
export function onTour(name: "elo:book", fn: (detail: TourBookDetail) => void): () => void;
export function onTour(name: string, fn: (detail: never) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail && typeof detail === "object") fn(detail as never);
  };
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}

/** Ask the tour to show a room (and bring the tour into view). */
export function showRoom(room: EloRoomId) {
  window.dispatchEvent(new CustomEvent("elo:show-room", { detail: { room } }));
  scrollToSection("top");
}

/* ---------------------------------------------------------------- page bus */

export type BookPrefill = {
  specialty: EloSpecialtyId;
  professionalId?: string;
  /** ISO start of a slot. */
  start?: string;
  mode?: EloMode;
};

/** A booking the visitor confirmed in this visit (kept in memory only). */
export type Booked = {
  specialty: EloSpecialtyId;
  professionalId: string;
  start: string;
  mode: EloMode;
  label: string;
};

type SiteEvents = {
  book: BookPrefill;
  booked: Booked;
  /** Open Iris. */
  iris: Record<string, never>;
};

type Listener<K extends keyof SiteEvents> = (payload: SiteEvents[K]) => void;

const listeners: { [K in keyof SiteEvents]: Set<Listener<K>> } = {
  book: new Set(),
  booked: new Set(),
  iris: new Set(),
};

export function onSite<K extends keyof SiteEvents>(name: K, fn: Listener<K>): () => void {
  listeners[name].add(fn);
  return () => {
    listeners[name].delete(fn);
  };
}

let lastBooked: Booked | null = null;

export function emitSite<K extends keyof SiteEvents>(name: K, payload: SiteEvents[K]) {
  if (name === "booked") lastBooked = payload as Booked;
  for (const fn of listeners[name]) fn(payload);
}

export const getLastBooked = () => lastBooked;

/** Prefill the booking form and take the visitor there. */
export const book = (prefill: BookPrefill) => emitSite("book", prefill);

/* ---------------------------------------------------------------- sections */

export const SECTION = {
  tour: "inicio",
  specialties: "especialidades",
  booking: "agendar",
  precheck: "pre-consulta",
  exams: "exames",
  where: "onde",
} as const;

export const SITE_NAV = [
  { label: "Especialidades", id: SECTION.specialties },
  { label: "Agendar", id: SECTION.booking },
  { label: "Exames", id: SECTION.exams },
  { label: "Onde", id: SECTION.where },
] as const;

/** Smooth-scroll to a section (respects its scroll-margin-top); "top" = the very top. */
export function scrollToSection(id: string) {
  const lenis = lenisRef.current;
  if (id === "top" || id === SECTION.tour) {
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.2 });
  else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}

/** Bring an element into view under the fixed bars when it is off screen (or too close to the top). */
export function revealEl(el: HTMLElement, offset = 150) {
  const top = el.getBoundingClientRect().top;
  if (top >= offset - 20 && top <= window.innerHeight * 0.6) return;
  const lenis = lenisRef.current;
  if (lenis) lenis.scrollTo(el, { offset: -offset, duration: 0.8 });
  else window.scrollTo({ top: window.scrollY + top - offset, behavior: reducedMotion() ? "auto" : "smooth" });
}

/* ---------------------------------------------------------------- shared clock */

let now: Date | null = null;
let timer = 0;
const clockSubs = new Set<() => void>();

function tick() {
  now = new Date();
  for (const fn of clockSubs) fn();
}

const clock = {
  subscribe(fn: () => void) {
    clockSubs.add(fn);
    if (clockSubs.size === 1) {
      tick();
      timer = window.setInterval(tick, 30_000);
    }
    return () => {
      clockSubs.delete(fn);
      if (clockSubs.size === 0) window.clearInterval(timer);
    };
  },
  get: () => now,
  server: (): Date | null => null,
};

/**
 * The visitor's clock, refreshed every 30 s. `null` on the server and in the first client render,
 * so availability is computed only in the browser (never a clock read during render).
 */
export const useNow = () => useSyncExternalStore(clock.subscribe, clock.get, clock.server);

/* ---------------------------------------------------------------- text */

/** Lowercase, no accents, single spaces: "Não CONSIGO  respirar" → "nao consigo respirar". */
export const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
