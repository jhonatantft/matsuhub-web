import { MARE_MEDIA, MARE_TABLES, MARE_ZONES, type MareImage, type MareTable, type MareZoneId } from "@/content/mare";

/**
 * Geometry of the Maré tour, measured by eye on the master layout (public/mare/salon.jpg) and
 * on the facade. Every number is a FRACTION of its picture (0..1, origin top-left), so it holds at
 * any resolution. Shapes are rounded boxes: centre x/y, half width/height, and `round` (0 = sharp
 * corners … 1 = stadium/ellipse). Check them with the lab overlay: /lab/mare?hot=1.
 */

export type Shape = { x: number; y: number; hw: number; hh: number; round: number };

/** Hover targets on the cut-away, keyed by the table ids of content/mare.ts. */
export const TABLE_SHAPES: Record<string, Shape> = {
  J1: { x: 0.347, y: 0.714, hw: 0.036, hh: 0.052, round: 0.9 },
  J2: { x: 0.444, y: 0.714, hw: 0.036, hh: 0.052, round: 0.9 },
  J3: { x: 0.5425, y: 0.714, hw: 0.036, hh: 0.052, round: 0.9 },
  J4: { x: 0.634, y: 0.714, hw: 0.036, hh: 0.052, round: 0.9 },
  J5: { x: 0.724, y: 0.714, hw: 0.036, hh: 0.052, round: 0.9 },
  R1: { x: 0.341, y: 0.405, hw: 0.042, hh: 0.062, round: 1 },
  R2: { x: 0.339, y: 0.528, hw: 0.043, hh: 0.064, round: 1 },
  R3: { x: 0.617, y: 0.405, hw: 0.042, hh: 0.062, round: 1 },
  R4: { x: 0.624, y: 0.528, hw: 0.043, hh: 0.064, round: 1 },
  C1: { x: 0.48, y: 0.5, hw: 0.058, hh: 0.124, round: 0.35 },
  B1: { x: 0.477, y: 0.307, hw: 0.128, hh: 0.058, round: 0.4 },
  T1: { x: 0.829, y: 0.53, hw: 0.058, hh: 0.05, round: 0.6 },
  T2: { x: 0.852, y: 0.634, hw: 0.063, hh: 0.05, round: 0.6 },
};

/**
 * Zone targets. Tables win the hit test, so the bookable zones answer on the floor around their
 * tables; "balcao" is the open kitchen and grill behind the chef's counter (B1 is the counter).
 */
export const ZONE_SHAPES: Record<MareZoneId, Shape> = {
  bar: { x: 0.195, y: 0.442, hw: 0.083, hh: 0.168, round: 0.25 },
  adega: { x: 0.719, y: 0.222, hw: 0.07, hh: 0.14, round: 0.15 },
  balcao: { x: 0.458, y: 0.158, hw: 0.18, hh: 0.09, round: 0.2 },
  janela: { x: 0.525, y: 0.742, hw: 0.236, hh: 0.08, round: 0.3 },
  salao: { x: 0.484, y: 0.497, hw: 0.2, hh: 0.158, round: 0.2 },
  terraco: { x: 0.846, y: 0.5, hw: 0.13, hh: 0.262, round: 0.15 },
};

/** Hit-test order for zones: small and specific first. */
export const ZONE_ORDER: MareZoneId[] = ["adega", "bar", "balcao", "janela", "salao", "terraco"];

/** The wood fire on the grill (glow centre + radii) and the line the embers rise from. */
export const FIRE = { x: 0.481, y: 0.214, rx: 0.07, ry: 0.045 };

/** Candles and lamps on the cut-away that twinkle. */
export const CANDLES: readonly (readonly [number, number])[] = [
  [0.339, 0.354], [0.617, 0.354], [0.339, 0.468], [0.624, 0.468],
  [0.48, 0.384], [0.48, 0.488], [0.467, 0.52], [0.494, 0.488],
  [0.346, 0.695], [0.444, 0.695], [0.5425, 0.695], [0.634, 0.695], [0.725, 0.695],
  [0.3925, 0.261], [0.561, 0.253], [0.586, 0.257],
  [0.204, 0.487], [0.2325, 0.321], [0.197, 0.505],
  [0.822, 0.511], [0.848, 0.614], [0.937, 0.686], [0.722, 0.531], [0.185, 0.625],
];

/** The strip of sea along the bottom of the cut-away (y range). */
export const SEA = { y0: 0.855, y1: 0.976 };

/** Where the front door is on the cut-away (the salon reveal starts from here). */
export const SALON_ENTRANCE = { x: 0.14, y: 0.69 };

/** The open door on the facade: the hover target and the glowing doorway behind it. */
export const DOOR: Shape = { x: 0.33, y: 0.535, hw: 0.121, hh: 0.27, round: 0.04 };
export const DOORWAY = { x: 0.366, y: 0.55, rx: 0.085, ry: 0.24 };

/* ───────────── Scenes ───────────── */

export type SceneId = "facade" | "salon" | `view:${MareZoneId}`;

export const viewScene = (zone: MareZoneId): SceneId => `view:${zone}`;

export function imageOfScene(scene: SceneId): MareImage {
  if (scene === "facade") return MARE_MEDIA.facade;
  if (scene === "salon") return MARE_MEDIA.salon;
  const zone = scene.slice(5) as MareZoneId;
  return MARE_ZONES.find((z) => z.id === zone)!.view;
}

/* ───────────── Items (tables + zones) ───────────── */

export type ItemId = string; // a table id ("J3") or "zone:<id>"

export const zoneItem = (zone: MareZoneId): ItemId => `zone:${zone}`;
export const isZoneItem = (id: ItemId) => id.startsWith("zone:");
export const zoneOfItem = (id: ItemId): MareZoneId =>
  isZoneItem(id) ? (id.slice(5) as MareZoneId) : tableById(id)!.zone;

export const tableById = (id: string): MareTable | undefined => MARE_TABLES.find((t) => t.id === id);
export const zoneById = (id: MareZoneId) => MARE_ZONES.find((z) => z.id === id)!;

export function shapeOf(id: ItemId): Shape {
  return isZoneItem(id) ? ZONE_SHAPES[id.slice(5) as MareZoneId] : TABLE_SHAPES[id];
}

/** Every hover target, in hit-test order. */
export const ITEMS: ItemId[] = [...MARE_TABLES.map((t) => t.id), ...ZONE_ORDER.map(zoneItem)];

/** Index of each table in the shader's table arrays (same order as MARE_TABLES). */
export const TABLE_IDS = MARE_TABLES.map((t) => t.id);

/* ───────────── Party size, time slots, availability ───────────── */

export const PARTY_SIZES = [2, 4, 6, 10] as const;
export const SLOTS = ["19h", "20h", "21h30"] as const;
export type Slot = (typeof SLOTS)[number];

/** FNV-1a + a murmur finaliser: a stable 0..1 number per string. */
function hash01(text: string) {
  let x = 2166136261;
  for (let i = 0; i < text.length; i++) {
    x ^= text.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  x ^= x >>> 13;
  x = Math.imul(x, 0x5bd1e995);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

/** Deterministic availability of a table at a time slot (≈ 2 in 3 tables free). */
export const isFree = (tableId: string, slot: Slot) => hash01(`mare${tableId}${slot}`) < 0.68;

/**
 * Whether a party fits a table: enough seats and not wasting a big table on a small group.
 * The chef's counter seats people side by side, so any party up to 6 fits; the communal table
 * takes groups from 6.
 */
export function fits(table: MareTable, party: number) {
  if (party > table.seats) return false;
  if (table.id === "B1") return true;
  if (table.id === "C1") return party >= 6;
  return table.seats - party <= 2;
}

export type TableStatus = "livre" | "ocupada" | "nao-cabe";

export function statusOf(table: MareTable, party: number, slot: Slot): TableStatus {
  if (!fits(table, party)) return "nao-cabe";
  return isFree(table.id, slot) ? "livre" : "ocupada";
}

/** Other slots where the table is free (for "ocupada às 20h — livre às 21h30"). */
export const freeSlots = (tableId: string) => SLOTS.filter((slot) => isFree(tableId, slot));

export const seatsLabel = (n: number) => `${n} lugares`;
export const partyLabel = (n: number) => (n === 1 ? "1 pessoa" : `${n} pessoas`);
