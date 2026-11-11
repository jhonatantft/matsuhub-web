import { MARE_DISHES, MARE_TABLES, type MareAllergen, type MareDish, type MareZoneId } from "@/content/mare";
import { reducedMotion } from "@/lib/env";
import { lenisRef } from "@/lib/scroll";

/**
 * Wiring of the Maré demo page (client only).
 *
 * 1. The salon tour (components/mare/tour) talks through window CustomEvents:
 *      tour → page   mare:state   { state, zone?, tableId? }
 *                    mare:reserve { tableId, label, seats, zone, slot, party }
 *      page → tour   mare:show-table { tableId }   mare:show-zone { zone }
 * 2. The sections talk to each other through a tiny in-memory bus (prefill the form, open Nina,
 *    set the allergen filter) and share one store: the comanda (running order).
 */

export type TourState = "fachada" | "salao" | "vista";
export type TourStateDetail = { state: TourState; zone?: MareZoneId; tableId?: string };
export type TourReserveDetail = {
  tableId: string;
  label: string;
  seats: number;
  zone: MareZoneId;
  slot: string;
  party: number;
};

export function onTour(name: "mare:state", fn: (detail: TourStateDetail) => void): () => void;
export function onTour(name: "mare:reserve", fn: (detail: TourReserveDetail) => void): () => void;
export function onTour(name: string, fn: (detail: never) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail && typeof detail === "object") fn(detail as never);
  };
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}

export function showTable(tableId: string) {
  window.dispatchEvent(new CustomEvent("mare:show-table", { detail: { tableId } }));
}

export function showZone(zone: MareZoneId) {
  window.dispatchEvent(new CustomEvent("mare:show-zone", { detail: { zone } }));
}

/* ---------------------------------------------------------------- page bus */

export type ReservePrefill = { tableId?: string; slot?: string; party?: number; message?: string };

type SiteEvents = {
  /** Prefill (part of) the reservation form and flash it. */
  reserve: ReservePrefill;
  /** Open Nina; with "order" she reads the comanda back. */
  nina: { topic: "order" };
  /** Set the "Evitar" allergen toggles of the menu. */
  avoid: MareAllergen[];
};

type Listener<K extends keyof SiteEvents> = (payload: SiteEvents[K]) => void;

const listeners: { [K in keyof SiteEvents]: Set<Listener<K>> } = {
  reserve: new Set(),
  nina: new Set(),
  avoid: new Set(),
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

export const SECTION = {
  salon: "salao",
  menu: "cardapio",
  fire: "brasa",
  reserve: "reservas",
  where: "onde",
} as const;

export const SITE_NAV = [
  { label: "Salão", id: SECTION.salon },
  { label: "Cardápio", id: SECTION.menu },
  { label: "Reservas", id: SECTION.reserve },
  { label: "Onde", id: SECTION.where },
] as const;

/** Smooth-scroll to a section (respects its scroll-margin-top); "top" = the very top. */
export function scrollToSection(id: string) {
  const lenis = lenisRef.current;
  if (id === "top" || id === SECTION.salon) {
    if (lenis) lenis.scrollTo(0, { duration: 1.3 });
    else window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.3 });
  else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}

/* ---------------------------------------------------------------- data helpers */

export const SLOTS = ["19h", "20h", "21h30"] as const;
export type Slot = (typeof SLOTS)[number];

/** "20:00", "20h", "21h30", "21:30" → one of SLOTS (or undefined). */
export function toSlot(raw: string | undefined): Slot | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  const hhmm = digits.length <= 2 ? `${digits.padStart(2, "0")}00` : digits.padStart(4, "0");
  return SLOTS.find((s) => {
    const d = s.replace(/\D/g, "");
    return (d.length <= 2 ? `${d}00` : d) === hhmm;
  });
}

export const tableById = (id: string | undefined) => MARE_TABLES.find((t) => t.id === id);
export const dishById = (id: string) => MARE_DISHES.find((d) => d.id === id);

/** Allergens in display order, only those that some dish really contains. */
const ORDER: MareAllergen[] = ["crustáceos", "moluscos", "peixe", "castanhas", "leite"];
export const ALLERGENS = ORDER.filter((a) => MARE_DISHES.some((d) => d.allergens.includes(a)));

export const COURSE_LABEL: Record<MareDish["course"], string> = {
  entrada: "Entrada",
  principal: "Principal",
  sobremesa: "Sobremesa",
};

/* ---------------------------------------------------------------- comanda store */

export type ComandaLine = { dish: MareDish; qty: number };
type Comanda = Readonly<Record<string, number>>;

const EMPTY: Comanda = {};
let comanda: Comanda = EMPTY;
const comandaSubs = new Set<() => void>();

export const comandaStore = {
  subscribe(fn: () => void) {
    comandaSubs.add(fn);
    return () => {
      comandaSubs.delete(fn);
    };
  },
  get: () => comanda,
  server: () => EMPTY,
};

function setComanda(next: Comanda) {
  comanda = next;
  for (const fn of comandaSubs) fn();
}

export function addToComanda(id: string, qty = 1) {
  const next = { ...comanda, [id]: Math.max(0, (comanda[id] ?? 0) + qty) };
  if (next[id] === 0) delete next[id];
  setComanda(next);
}

export function clearComanda() {
  setComanda(EMPTY);
}

/** Lines in menu order + total. */
export function comandaLines(c: Comanda): { lines: ComandaLine[]; count: number; total: number } {
  const lines = MARE_DISHES.filter((d) => (c[d.id] ?? 0) > 0).map((dish) => ({ dish, qty: c[dish.id] }));
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    total: lines.reduce((n, l) => n + l.qty * l.dish.price, 0),
  };
}

export const currentComanda = () => comandaLines(comanda);
