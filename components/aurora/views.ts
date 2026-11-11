import { AURORA_MEDIA, AURORA_ROOMS, type AuroraImage } from "@/content/aurora";

/**
 * Vocabulary and geometry shared by the Aurora stage and its overlays.
 * Everything here is pure (no DOM, no three), so server components may import it too.
 */

export type AuroraRoom = (typeof AURORA_ROOMS)[number];
export type AuroraRoomId = AuroraRoom["id"];
export type AuroraExteriorView = "blueprint" | "day" | "dusk";
/** Every picture the stage can show. The three exterior views are one scene with two dials (build, dusk). */
export type AuroraView = AuroraExteriorView | "plan" | AuroraRoomId;
export type AuroraScene = "exterior" | "plan" | AuroraRoomId;

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export const AURORA_VIEWS: readonly AuroraView[] = [
  "blueprint",
  "day",
  "dusk",
  "plan",
  ...AURORA_ROOMS.map((r) => r.id),
];

export const isExterior = (view: AuroraView): view is AuroraExteriorView =>
  view === "blueprint" || view === "day" || view === "dusk";

export const sceneOf = (view: AuroraView): AuroraScene => (isExterior(view) ? "exterior" : view);

/** How far "inside" the building a view is: tower 0, plan 1, rooms 2. Cuts push in when it grows. */
export const depthOf = (view: AuroraView) => (isExterior(view) ? 0 : view === "plan" ? 1 : 2);

export const roomOf = (id: AuroraView): AuroraRoom | undefined => AURORA_ROOMS.find((r) => r.id === id);

export const imageOf = (view: AuroraView): AuroraImage =>
  isExterior(view) ? AURORA_MEDIA.exterior[view] : view === "plan" ? AURORA_MEDIA.plan : roomOf(view)!.image;

/** The build / dusk dials each exterior view stands for. */
export const EXTERIOR_PRESET: Record<AuroraExteriorView, { build: number; dusk: number }> = {
  blueprint: { build: 0, dusk: 0 },
  day: { build: 1, dusk: 0 },
  dusk: { build: 1, dusk: 1 },
};

/* ───────────── Framing: how each picture sits in a canvas of any shape ───────────── */

export type Framing = {
  /** Image point (fractions) kept at the centre of the free area when the picture is cropped. */
  fx: number;
  fy: number;
  /**
   * Region that must never be cropped: [x0, y0, x1, y1] in fractions. When set, the picture
   * may shrink below "cover" to fit it, and its flat background is extended to fill the rest.
   */
  safe?: readonly [number, number, number, number];
};

const box = AURORA_MEDIA.planBox;

export const framingOf = (scene: AuroraScene): Framing => {
  if (scene === "exterior") return { fx: AURORA_MEDIA.exteriorFocus.x, fy: AURORA_MEDIA.exteriorFocus.y };
  if (scene === "plan") return { fx: 0.5, fy: 0.505, safe: [box.x0, box.y0, box.x1, box.y1] };
  const focus = roomOf(scene)!.focus;
  return { fx: focus.x, fy: focus.y };
};

/* ───────────── Facade: floors as bands between the measured slab lines ───────────── */

const F = AURORA_MEDIA.facade;
export const FLOORS = F.floors;
export const FACADE = F;

const clampFloor = (floor: number) => Math.min(FLOORS, Math.max(1, floor));

/** Top/bottom of a floor band as image fractions. `floor` may be fractional (the band slides between floors). */
export function floorBand(floor: number, out: { top: number; bottom: number } = { top: 0, bottom: 0 }) {
  const f = clampFloor(floor);
  const lo = Math.floor(f);
  const t = f - lo;
  const hi = Math.min(FLOORS, lo + 1);
  // floor n spans lines[FLOORS - n] .. lines[FLOORS - n + 1]
  const top = F.lines[FLOORS - lo];
  const bottom = F.lines[FLOORS - lo + 1];
  out.top = top + (F.lines[FLOORS - hi] - top) * t;
  out.bottom = bottom + (F.lines[FLOORS - hi + 1] - bottom) * t;
  return out;
}

/** The floor under an image point (fractions), or null when the point is off the facade. */
export function floorAtPoint(x: number, y: number, tolerance = 0.004): number | null {
  if (x < F.left - tolerance || x > F.right + tolerance) return null;
  if (y < F.lines[0] || y >= F.lines[FLOORS]) return null;
  for (let i = 0; i < FLOORS; i++) if (y < F.lines[i + 1]) return FLOORS - i;
  return null;
}

/** Centre of a floor band on the image (fractions). */
export function floorCentre(floor: number, out: Point = { x: 0, y: 0 }) {
  const band = floorBand(floor);
  out.x = (F.left + F.right) / 2;
  out.y = (band.top + band.bottom) / 2;
  return out;
}

export const ordinalFloor = (floor: number) => `${floor}º andar`;
