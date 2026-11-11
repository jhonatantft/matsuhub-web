import { BufferAttribute, BufferGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry } from "three";

/** Small seeded PRNG so every visit (and every screenshot) gets the same hub. */
export function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Normal-distributed random number (Box–Muller). */
function gauss(rnd: Rng) {
  return Math.sqrt(-2 * Math.log(1 - rnd() * 0.999999)) * Math.cos(2 * Math.PI * rnd());
}

/** Writes a point of a jittered Fibonacci lattice: evenly spread, with no visible spirals. */
function fibonacci(out: Float32Array, o: number, i: number, n: number, jitter: number, rnd: Rng) {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = i * GOLDEN;
  const x = Math.cos(phi) * r + (rnd() - 0.5) * jitter;
  const yy = y + (rnd() - 0.5) * jitter;
  const z = Math.sin(phi) * r + (rnd() - 0.5) * jitter;
  const l = Math.hypot(x, yy, z) || 1;
  out[o] = x / l;
  out[o + 1] = yy / l;
  out[o + 2] = z / l;
}

/** A random order for `n` slots, so that any prefix of a buffer is an even sample of the whole. */
function shuffled(n: number, rnd: Rng) {
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

function randomAttribute(count: number, rnd: Rng) {
  const a = new Float32Array(count * 4);
  for (let i = 0; i < a.length; i++) a[i] = rnd();
  return new BufferAttribute(a, 4);
}

/** Unit directions for the shell; the shader lifts them onto the living surface. */
export function shellGeometry(count: number, rnd: Rng) {
  const pos = new Float32Array(count * 3);
  const jitter = 1.1 * Math.sqrt((4 * Math.PI) / count);
  const order = shuffled(count, rnd);
  for (let i = 0; i < count; i++) fibonacci(pos, order[i] * 3, i, count, jitter, rnd);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aRand", randomAttribute(count, rnd));
  return g;
}

const CORE_LAYERS = [0.16, 0.3, 0.46, 0.64, 0.84, 1];

/**
 * Points for the core, inside the unit ball: most sit on a few nested membranes (the shader
 * makes each one flow and spin on its own), the rest fill the volume between them.
 */
export function coreGeometry(count: number, rnd: Rng) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = rnd() * 2 - 1;
    const phi = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - y * y);
    // outer membranes are bigger, so they get more points; the hot centre stays crowded anyway
    const layer = CORE_LAYERS[Math.min(CORE_LAYERS.length - 1, Math.floor(Math.pow(rnd(), 0.62) * CORE_LAYERS.length))];
    const r = rnd() < 0.8 ? layer + gauss(rnd) * 0.012 : 0.05 + 0.95 * Math.pow(rnd(), 0.8);
    pos[i * 3] = Math.cos(phi) * s * r;
    pos[i * 3 + 1] = y * r;
    pos[i * 3 + 2] = Math.sin(phi) * s * r;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aRand", randomAttribute(count, rnd));
  return g;
}

export type RingSpec = { radius: number; pulses: number };

/**
 * Three kinds of point per ring: a hair-thin line, a dusty band around it, and one bright bead
 * per light pulse. Positions are built in the shader from (angle, radial offset, lift, ring).
 */
export function ringGeometry(count: number, rings: readonly RingSpec[], rnd: Rng) {
  const beads = rings.reduce((n, r) => n + r.pulses, 0);
  const total = count + beads;
  const ring = new Float32Array(total * 4);
  const rand = new Float32Array(total * 4);
  const reach = rings.reduce((n, r) => n + r.radius, 0);
  const put = (i: number, angle: number, radial: number, lift: number, id: number, kind: number) => {
    ring.set([angle, radial, lift, id], i * 4);
    rand.set([kind, rnd(), rnd(), rnd()], i * 4);
  };
  // beads first, so they survive when only a prefix of the buffer is drawn
  let i = 0;
  rings.forEach((spec, id) => {
    for (let m = 0; m < spec.pulses; m++) put(i++, m, 0, 0, id, 2);
  });
  const order = shuffled(count, rnd);
  let j = 0;
  rings.forEach((spec, id) => {
    // bigger rings get more points; the last one takes whatever rounding left over
    const n = id === rings.length - 1 ? count - j : Math.round((count * spec.radius) / reach);
    for (let k = 0; k < n && j < count; k++, j++) {
      const band = rnd() < 0.4;
      put(
        beads + order[j],
        rnd() * Math.PI * 2,
        band ? gauss(rnd) * 0.034 + 0.012 : gauss(rnd) * 0.0022,
        band ? gauss(rnd) * 0.007 : gauss(rnd) * 0.0014,
        id,
        band ? 1 : 0,
      );
    }
  });
  const g = new BufferGeometry();
  // three needs a `position` attribute to know how many vertices to draw; the shader ignores it
  g.setAttribute("position", new BufferAttribute(new Float32Array(total * 3), 3));
  g.setAttribute("aRing", new BufferAttribute(ring, 4));
  g.setAttribute("aRand", new BufferAttribute(rand, 4));
  return g;
}

/** A wide, slightly flattened cloud around the hub. */
export function dustGeometry(count: number, rnd: Rng) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = rnd() * 2 - 1;
    const phi = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - y * y);
    const r = 1.22 + 3.2 * Math.pow(rnd(), 2);
    pos[i * 3] = Math.cos(phi) * s * r;
    pos[i * 3 + 1] = y * r * 0.72;
    pos[i * 3 + 2] = Math.sin(phi) * s * r;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aRand", randomAttribute(count, rnd));
  return g;
}

/** Node directions on the unit sphere, as a flat xyz array. */
export function nodeDirections(count: number, rnd: Rng) {
  const dirs = new Float32Array(count * 3);
  const jitter = 0.5 * Math.sqrt((4 * Math.PI) / count);
  for (let i = 0; i < count; i++) fibonacci(dirs, i * 3, i, count, jitter, rnd);
  return dirs;
}

export function nodeGeometry(dirs: Float32Array, rnd: Rng) {
  const count = dirs.length / 3;
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = rnd();
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(dirs, 3));
  g.setAttribute("aSeed", new BufferAttribute(seed, 1));
  return g;
}

export type AgentBuffers = {
  geometry: InstancedBufferGeometry;
  from: InstancedBufferAttribute;
  to: InstancedBufferAttribute;
  data: InstancedBufferAttribute;
};

/**
 * One strip (the tapered trail) plus one quad (the head) per agent, instanced. `position` is
 * (u, side, 0) along the strip and (corner x, corner y, 1) for the head.
 */
export function agentGeometry(count: number, segments: number): AgentBuffers {
  const verts = (segments + 1) * 2 + 4;
  const pos = new Float32Array(verts * 3);
  const index = new Uint16Array(segments * 6 + 6);
  for (let j = 0; j <= segments; j++) {
    const u = j / segments;
    pos.set([u, -1, 0, u, 1, 0], j * 6);
  }
  for (let j = 0; j < segments; j++) {
    const a = j * 2;
    index.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], j * 6);
  }
  const h = (segments + 1) * 2;
  pos.set([-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1], h * 3);
  index.set([h, h + 1, h + 2, h, h + 2, h + 3], segments * 6);

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(pos, 3));
  geometry.setIndex(new BufferAttribute(index, 1));
  const from = new InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  const to = new InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  const data = new InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(DynamicDrawUsage);
  geometry.setAttribute("iFrom", from);
  geometry.setAttribute("iTo", to);
  geometry.setAttribute("iData", data);
  geometry.instanceCount = count;
  return { geometry, from, to, data };
}
