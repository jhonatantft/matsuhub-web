/**
 * The load-test model: pure functions, no three.js, no React, no clock. Everything on the page
 * (machines lit in 3D, packets, the numbers, the chart, the verdict) reads `loadPose()`, so they
 * can never disagree. The assumptions are written out in content/lab/bodies.ts ("how it works");
 * they are illustrative numbers for a typical system, not measurements.
 */

export type Arch = "single" | "scalable";

/* ---------------------------------------------------------------- assumptions */

/** One page view per active person every 20 s. */
const PAGE_EVERY_S = 20;
/** Per page view: 1 dynamic request + 8 static files. */
const STATIC_PER_PAGE = 8;
/** CPU seconds. */
const CPU_DYNAMIC = 0.04;
const CPU_STATIC = 0.002;
const QUERIES_PER_REQUEST = 4;
const CPU_QUERY = 0.003;
const READ_SHARE = 0.85;
/** Single server: 4 cores for app + database + static files. */
const SINGLE_CORES = 4;
/** Scalable: CDN, autoscaled 2-core app machines, cache, primary + replicas (8 cores each). */
const CDN_HIT = 0.95;
const APP_CORES = 2;
const TARGET_USE = 0.5;
export const MIN_MACHINES = 2;
export const MAX_MACHINES = 48;
const CACHE_HIT = 0.7;
const DB_CORES = 8;
export const MAX_REPLICAS = 3;
/** Network round trip, ms. */
const NETWORK_MS = 60;
/** Requests that wait longer than this give up. */
export const TIMEOUT_MS = 10000;

export const USERS_MIN = 10;
export const USERS_MAX = 50000;

/* ---------------------------------------------------------------- pose */

export type LoadPose = {
  users: number;
  arch: Arch;
  /** Requests per second reaching the site (all of them). */
  rps: number;
  dynamicRps: number;
  staticRps: number;
  /** Share of static files the CDN answered (0 for the single server). */
  cdnShare: number;
  /** App machines running (1 for the single server). */
  machines: number;
  /** Machines the autoscaler wanted (can exceed MAX_MACHINES). */
  wanted: number;
  /** CPU use of the app tier (single server: of the whole box), 0..∞. */
  appUse: number;
  /** Database read replicas running (scalable only). */
  replicas: number;
  /** CPU use of the busiest database node, 0..∞ (single server: shares appUse). */
  dbUse: number;
  /** 95th-percentile response time, ms (TIMEOUT_MS when saturated). */
  p95: number;
  /** Share of requests that time out, 0..1. */
  errors: number;
  /** "ok" | "slow" | "down", from p95 and errors. */
  status: "ok" | "slow" | "down";
};

export const emptyPose = (): LoadPose => ({
  users: 0,
  arch: "single",
  rps: 0,
  dynamicRps: 0,
  staticRps: 0,
  cdnShare: 0,
  machines: 1,
  wanted: 1,
  appUse: 0,
  replicas: 0,
  dbUse: 0,
  p95: 0,
  errors: 0,
  status: "ok",
});

/** M/M/1 response time: mean = S / (1 − ρ); p95 ≈ ln(20) × mean. */
const P95 = Math.log(20);
const queueMs = (serviceMs: number, use: number) => (use >= 1 ? Infinity : (P95 * serviceMs) / (1 - use));

/** Writes the pose for `users` people on `arch` into `out` (no allocation) and returns it. */
export function loadPose(users: number, arch: Arch, out: LoadPose = emptyPose()): LoadPose {
  const pages = users / PAGE_EVERY_S;
  const dynamicRps = pages;
  const staticRps = pages * STATIC_PER_PAGE;
  out.users = users;
  out.arch = arch;
  out.rps = dynamicRps + staticRps;
  out.dynamicRps = dynamicRps;
  out.staticRps = staticRps;

  let p95: number;
  let worst: number;
  if (arch === "single") {
    const cpuPerDynamic = CPU_DYNAMIC + QUERIES_PER_REQUEST * CPU_QUERY;
    const use = (dynamicRps * cpuPerDynamic + staticRps * CPU_STATIC) / SINGLE_CORES;
    out.cdnShare = 0;
    out.machines = 1;
    out.wanted = 1;
    out.appUse = use;
    out.replicas = 0;
    out.dbUse = use;
    worst = use;
    p95 = NETWORK_MS + queueMs(cpuPerDynamic * 1000, use);
  } else {
    const originStatic = staticRps * (1 - CDN_HIT);
    const appCpu = dynamicRps * CPU_DYNAMIC + originStatic * CPU_STATIC;
    const wanted = Math.max(MIN_MACHINES, Math.ceil(appCpu / (APP_CORES * TARGET_USE)));
    const machines = Math.min(MAX_MACHINES, wanted);
    const appUse = appCpu / (machines * APP_CORES);

    const queries = dynamicRps * QUERIES_PER_REQUEST;
    const reads = queries * READ_SHARE * (1 - CACHE_HIT);
    const writes = queries * (1 - READ_SHARE);
    const dbCap = DB_CORES / CPU_QUERY;
    // Replicas come on when reads alone would push the primary past the target.
    const replicas = Math.min(MAX_REPLICAS, Math.max(0, Math.ceil((reads + writes) / (dbCap * TARGET_USE)) - 1));
    // The primary takes every write plus an equal share of the reads.
    const primaryUse = (writes + reads / (replicas + 1)) / dbCap;
    out.cdnShare = CDN_HIT;
    out.machines = machines;
    out.wanted = wanted;
    out.appUse = appUse;
    out.replicas = replicas;
    out.dbUse = primaryUse;
    worst = Math.max(appUse, primaryUse);
    p95 = NETWORK_MS + queueMs(CPU_DYNAMIC * 1000, appUse) + queueMs(QUERIES_PER_REQUEST * CPU_QUERY * 1000, primaryUse);
  }

  out.errors = worst >= 1 ? 1 - 1 / worst : 0;
  out.p95 = Math.min(TIMEOUT_MS, p95);
  out.status = out.errors > 0 || out.p95 >= 3000 ? "down" : out.p95 >= 800 ? "slow" : "ok";
  return out;
}

/* ---------------------------------------------------------------- limits & curves */

const scratch = emptyPose();

/** Fewest people at which `arch` starts failing requests (bisection on errors > 0). */
export function breakingPoint(arch: Arch): number {
  let lo = USERS_MIN;
  let hi = 1_000_000;
  if (loadPose(hi, arch, scratch).errors === 0) return Infinity;
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (loadPose(mid, arch, scratch).errors > 0) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Slider position (0..1, logarithmic) ↔ people. */
export const usersAt = (x: number) => USERS_MIN * Math.pow(USERS_MAX / USERS_MIN, Math.min(1, Math.max(0, x)));
export const positionOf = (users: number) => Math.log(users / USERS_MIN) / Math.log(USERS_MAX / USERS_MIN);

/** p95 curve of `arch` across the slider, `n` samples of [x 0..1, p95 ms]. */
export function curve(arch: Arch, n = 64): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = i / n;
    pts.push([x, loadPose(usersAt(x), arch, scratch).p95]);
  }
  return pts;
}

/* ---------------------------------------------------------------- tour */

export type TourState = { users: number; arch: Arch; open: number };

/** The tour's beats: the state each button press leads to. */
export const BEATS: readonly (TourState & { name: string })[] = [
  { name: "single-normal", users: 150, arch: "single", open: 0 },
  { name: "single-viral", users: 2500, arch: "single", open: 0 },
  { name: "scalable-viral", users: 2500, arch: "scalable", open: 0 },
  { name: "scalable-bf", users: 20000, arch: "scalable", open: 0 },
  { name: "scalable-bf-open", users: 20000, arch: "scalable", open: 1 },
  { name: "scalable-normal", users: 150, arch: "scalable", open: 0 },
];

/** State at tour time `t` (beat index; fractions ease between beats, people in log space). */
export function tourState(t: number): TourState {
  const max = BEATS.length - 1;
  const c = Math.min(max, Math.max(0, t));
  const i = Math.min(max - 1, Math.floor(c));
  const k = c - i;
  const a = BEATS[i];
  const b = BEATS[i + 1];
  const e = k * k * (3 - 2 * k);
  return {
    users: Math.exp(Math.log(a.users) + (Math.log(b.users) - Math.log(a.users)) * e),
    arch: k < 0.5 ? a.arch : b.arch,
    open: a.open + (b.open - a.open) * e,
  };
}
