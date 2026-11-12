import {
  ELO_MEDIA,
  ELO_PROFESSIONALS,
  ELO_ROOMS,
  ELO_SPECIALTIES,
  type EloImage,
  type EloRoomId,
  type EloSpecialtyId,
} from "@/content/clinica";
import { nextFreeForProfessional, nextFreeForSpecialty, type EloSlot } from "@/lib/clinica/availability";

/**
 * Geometry of the Elo tour, measured on the master cut-away (public/clinica/floor-1600.jpg,
 * 1600×904) and on the facade. Every number is a FRACTION of its picture (0..1, origin top-left),
 * so it holds at any resolution. Check them with the lab overlay: /lab/clinica?hot=1 (magenta =
 * room outlines, cyan = the extra hit area of each consultation room's door).
 */

export type Pt = readonly [number, number];
/** x0, y0, x1, y1 */
export type Rect = readonly [number, number, number, number];

/**
 * Each room's outline as seen from above: the top edges of its walls (back wall, partitions,
 * front wall). `door` is the face of the front wall below a consultation room, with its door:
 * it answers to hover/click as that room too, but the outline stays on the room itself.
 */
export const ROOM_GEO: Record<EloRoomId, { poly: readonly Pt[]; door?: Rect }> = {
  recepcao: { poly: [[0.0625, 0.5111], [0.32, 0.5111], [0.3237, 0.9403], [0.0325, 0.9403], [0.0325, 0.7633]] },
  espera: { poly: [[0.3237, 0.5111], [0.7288, 0.5111], [0.7412, 0.7743], [0.7475, 0.9403], [0.3237, 0.9403]] },
  c1: { poly: [[0.125, 0.0929], [0.2687, 0.0929], [0.2525, 0.3827], [0.1075, 0.3827]], door: [0.095, 0.3827, 0.2537, 0.4779] },
  c2: { poly: [[0.28, 0.0929], [0.4219, 0.0929], [0.4175, 0.3827], [0.2587, 0.3827]], door: [0.2537, 0.3827, 0.42, 0.4779] },
  c3: { poly: [[0.4356, 0.0929], [0.57, 0.0929], [0.5687, 0.3827], [0.4275, 0.3827]], door: [0.42, 0.3827, 0.575, 0.4779] },
  c4: { poly: [[0.5813, 0.0929], [0.72, 0.0929], [0.7325, 0.3827], [0.5794, 0.3827]], door: [0.575, 0.3827, 0.7475, 0.4779] },
  exames: {
    poly: [[0.7356, 0.0929], [0.9062, 0.0929], [0.9375, 0.4425], [0.8, 0.4469], [0.7975, 0.4912], [0.7638, 0.4912], [0.7531, 0.4159]],
  },
  coleta: {
    poly: [[0.8025, 0.4513], [0.9363, 0.4513], [0.9762, 0.781], [0.9781, 0.9381], [0.7531, 0.9381], [0.7544, 0.6704], [0.8025, 0.6681]],
  },
};

/** Max vertices per outline (the shader's stride). */
export const MAX_VERTS = 8;

/** Outer edge of the model on the cut-away: outside it, the studio grey is repainted as linen. */
export const HULL: readonly Pt[] = [
  [0.1163, 0.0819], [0.9175, 0.0796], [0.9644, 0.4535], [0.9637, 0.5752],
  [0.9919, 0.781], [0.98, 0.9502], [0.0206, 0.9502], [0.01, 0.7743],
];
/** The cut-away's studio backdrop (sRGB 0..1), measured on its corners. */
export const FLOOR_BACKDROP = [213 / 255, 208 / 255, 205 / 255] as const;

/** Living green wall: where the leaves may sway (per picture). */
export const LEAVES = {
  floor: [0.3825, 0.5288, 0.6156, 0.677] as Rect,
  facade: [0.3937, 0.4591, 0.6156, 0.6637] as Rect,
  espera: [0.25, 0.0774, 0.7562, 0.5088] as Rect,
};

/** Reception desk (where the "chamada" pulse starts) and its brass lamp, on the cut-away. */
export const DESK: Pt = [0.1988, 0.7301];
export const LAMP: Pt = [0.2637, 0.5586];
/** The glass entrance door on the cut-away (the floor reveal starts here). */
export const FLOOR_ENTRANCE: Pt = [0.0719, 0.8462];

export type Shape = { x: number; y: number; hw: number; hh: number; round: number };
/** The entrance door on the facade (glass leaf + side light), and the light behind it. */
export const DOOR: Shape = { x: 0.115, y: 0.5796, hw: 0.0525, hh: 0.3142, round: 0.03 };
export const DOORWAY = { x: 0.128, y: 0.62, rx: 0.07, ry: 0.26 };

/* ───────────── Rooms ───────────── */

export const ROOM_IDS: EloRoomId[] = ELO_ROOMS.map((r) => r.id);
export const roomById = (id: EloRoomId) => ELO_ROOMS.find((r) => r.id === id)!;
export const isRoomId = (id: unknown): id is EloRoomId => typeof id === "string" && (ROOM_IDS as string[]).includes(id);

/** Bounding box of a room's outline (fractions): centre and half size. */
export function roomBox(id: EloRoomId) {
  const pts = ROOM_GEO[id].poly;
  let x0 = 1;
  let y0 = 1;
  let x1 = 0;
  let y1 = 0;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, hw: (x1 - x0) / 2, hh: (y1 - y0) / 2 };
}
export const ROOM_BOX = Object.fromEntries(ROOM_IDS.map((id) => [id, roomBox(id)])) as Record<EloRoomId, ReturnType<typeof roomBox>>;

/** Even-odd point-in-polygon, in picture fractions. */
export function inPoly(u: number, v: number, pts: readonly Pt[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function roomAt(u: number, v: number): EloRoomId | null {
  for (const id of ROOM_IDS) {
    const g = ROOM_GEO[id];
    if (inPoly(u, v, g.poly)) return id;
    if (g.door && u >= g.door[0] && u <= g.door[2] && v >= g.door[1] && v <= g.door[3]) return id;
  }
  return null;
}

export const specialtyOf = (id: EloRoomId) => {
  const s = roomById(id).specialty;
  return s ? ELO_SPECIALTIES.find((x) => x.id === s)! : null;
};
export const prosOf = (specialty: EloSpecialtyId) => ELO_PROFESSIONALS.filter((p) => p.specialty === specialty);

export type ProSlots = { id: string; name: string; slots: EloSlot[] };
export type Availability = Partial<Record<EloSpecialtyId, { next: EloSlot | null; pros: ProSlots[] }>>;

/** Next free times of every specialty with a room, and of each of its professionals. `now` comes from an effect. */
export function availability(now: Date): Availability {
  const out: Availability = {};
  for (const room of ELO_ROOMS) {
    const s = room.specialty;
    if (!s || out[s]) continue;
    out[s] = {
      next: nextFreeForSpecialty(s, now, 1)[0] ?? null,
      pros: prosOf(s).map((p) => ({ id: p.id, name: p.name, slots: nextFreeForProfessional(p.id, now, 3) })),
    };
  }
  return out;
}

/** Short labels for the room bars. */
export const SHORT: Record<EloRoomId, string> = {
  recepcao: "Recepção",
  espera: "Espera",
  c1: "Consultório 1",
  c2: "Consultório 2",
  c3: "Consultório 3",
  c4: "Consultório 4",
  exames: "Exames",
  coleta: "Coleta",
};

/* ───────────── Scenes ───────────── */

export type SceneId = "facade" | "floor" | `view:${EloRoomId}`;
export const viewScene = (room: EloRoomId): SceneId => `view:${room}`;

export function imageOfScene(scene: SceneId): EloImage {
  if (scene === "facade") return ELO_MEDIA.facade;
  if (scene === "floor") return ELO_MEDIA.floor;
  return roomById(scene.slice(5) as EloRoomId).view;
}

/** Leaves that sway in a scene's picture, if any. */
export function leavesOf(scene: SceneId): Rect | null {
  if (scene === "floor") return LEAVES.floor;
  if (scene === "facade") return LEAVES.facade;
  return imageOfScene(scene).src === roomById("espera").view.src ? LEAVES.espera : null;
}
