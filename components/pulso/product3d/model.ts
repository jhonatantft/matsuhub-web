/**
 * The Pulso One as numbers. No three.js here: dimensions, the part list and the exploded pose
 * as pure functions of one input, `explode` (0 = assembled, 1 = fully apart). Everything the
 * scene and the UI show about the pose comes from `partOffset()`.
 *
 * Units are centimetres. The ear axis is X (right cup at +X, its outer face looking +X), Y is up,
 * Z points out of the face of the wearer. Dimensions were read off public/pulso/one.jpg against a
 * 98 mm cup — the photo is the reference, the numbers are an informed estimate, not a CAD file.
 */
import { PULSO_ONE_PARTS } from "@/content/pulso";
import { clamp, easeInOutCubic } from "@/lib/math";

export type PartId = (typeof PULSO_ONE_PARTS)[number]["id"];
export const PART_IDS = PULSO_ONE_PARTS.map((p) => p.id) as PartId[];

export const DIM = {
  /** Cup radius (98 mm cups). */
  R: 4.9,
  /** Inner faces of the two cushions are this far apart (a relaxed head width). */
  gap: 7.0,
  cushionDepth: 3.1,
  cushionHole: 1.75,
  /** How much taller than wide the cushion opening is. */
  cushionOval: 1.5,
  shellDepth: 3.2,
  /** Steel arm: thickness along X, width along Z, from the pivot up into the band. */
  armT: 0.34,
  armW: 1.15,
  pivotY: 2.7,
  bandEndY: 8.2,
  bandTopY: 17.2,
  bandT: 0.5,
  bandWTop: 4.3,
  bandWEnd: 2.6,
  padT: 1.25,
} as const;

/** X of the shell's inner rim, of the outer face and of the steel arm's centre (right side). */
export const X = {
  cushionIn: DIM.gap / 2,
  shellIn: DIM.gap / 2 + DIM.cushionDepth,
  face: DIM.gap / 2 + DIM.cushionDepth + DIM.shellDepth,
  arm: DIM.gap / 2 + DIM.cushionDepth + DIM.shellDepth + 0.5,
} as const;

/** Vertical centre of the assembled object; the scene lifts the model by -CENTER_Y. */
export const CENTER_Y = (DIM.bandTopY - DIM.R) / 2;

/** Microphone angles around the cup axis (radians, in the YZ plane), four per side. */
export const MIC_ANGLES = [0.62, 2.3, 3.75, 5.45] as const;

/**
 * How each part leaves the assembly. `x` is along the ear axis away from the head (mirrored per
 * side), `y` straight up, `r` radially out from the cup axis. `at` is when in the 0..1 explode the
 * part starts moving; every part takes `SPAN` of the range, so outer parts lead and inner ones follow.
 */
const MOVE: Record<PartId, { x: number; y: number; r: number; at: number }> = {
  arco: { x: 0, y: 5.6, r: 0, at: 0 },
  hastes: { x: 6.8, y: 3.9, r: 0, at: 0.04 },
  almofada: { x: -2.5, y: 0, r: 0, at: 0.06 },
  anel: { x: 8.2, y: 0, r: 0, at: 0.1 },
  concha: { x: 5.9, y: 0, r: 0, at: 0.12 },
  driver: { x: -1.0, y: 0, r: 0, at: 0.2 },
  microfones: { x: 4.4, y: 0, r: 1.6, at: 0.24 },
  placa: { x: 3.1, y: 0, r: 0, at: 0.28 },
  bateria: { x: 1.25, y: 0, r: 0, at: 0.32 },
};
const SPAN = 0.62;

/** Parts that sit inside the cup and can only be seen with the product open. */
export const INNER: ReadonlySet<PartId> = new Set(["microfones", "placa", "bateria", "driver"]);

export type Offset = { x: number; y: number; r: number };

/** Where `id` sits at `explode` for the side `s` (+1 right, -1 left). Writes into `out`. */
export function partOffset(id: PartId, s: 1 | -1, explode: number, out: Offset): Offset {
  const m = MOVE[id];
  const k = easeInOutCubic(clamp((explode - m.at) / SPAN));
  out.x = m.x * k * s;
  out.y = m.y * k;
  out.r = m.r * k;
  return out;
}

/**
 * The camera's turn that comes with the exploded view: the cups' parts are coaxial, so the view
 * turns a little more side-on and up as they spread (radians, added to the user's own orbit).
 */
export const exploreYaw = (explode: number) => -0.5 + 0.17 * easeInOutCubic(explode);
/** The cups' rest swivel (radians) and how it straightens as they open, so the parts fan out. */
export const SWIVEL = 0.46;
export const swivelAt = (explode: number) => SWIVEL * (1 - 0.74 * easeInOutCubic(explode));
export const explorePitch = (explode: number) => 0.04 + 0.12 * easeInOutCubic(explode);

/** The object's box at `explode` (model space, before centring), for framing. */
const ex: Offset = { x: 0, y: 0, r: 0 };
export type Extents = { x: number; top: number; bottom: number };
export function extents(explode: number, out: Extents): Extents {
  const band = partOffset("arco", 1, explode, ex).y;
  const arms = partOffset("hastes", 1, explode, ex).x;
  const ring = partOffset("anel", 1, explode, ex).x;
  out.x = Math.max(X.arm + 1 + arms, X.face + 0.6 + ring);
  out.top = DIM.bandTopY + DIM.bandT + band;
  out.bottom = -DIM.R;
  return out;
}

/** The working demo: a noise wave, the anti-noise the chip makes and what is left at the ear. */
export const noiseAt = (x: number, t: number) =>
  0.62 * Math.sin(1.9 * x - 7.0 * t) + 0.3 * Math.sin(4.3 * x - 11.3 * t + 1.3) + 0.12 * Math.sin(9.1 * x - 17 * t);
export const musicAt = (x: number, t: number) => 0.55 * Math.sin(1.25 * x - 4.2 * t) * (0.8 + 0.2 * Math.sin(0.6 * t));
