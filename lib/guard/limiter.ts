import "server-only";
import { kvConfigured, kvPipeline } from "./kv";

/**
 * Rate limiter with one API and two backends:
 *
 *  - Upstash Redis / Vercel KV (lib/guard/kv.ts) when configured: shared by every instance and
 *    region, so the limits hold for real. One pipeline round trip per check.
 *  - In-memory, per instance, otherwise (and whenever the store fails). BEST-EFFORT ONLY: a
 *    serverless deployment runs many short-lived instances, each with its own empty Map, so a
 *    determined client spread over instances gets more than the limit. It still stops the
 *    common case (one script hammering a warm instance) and costs nothing.
 *
 * Algorithm: sliding-window counter. Each rule keeps a counter for the current fixed window and
 * reads the previous one; the estimate is prev × (share of the previous window still inside the
 * sliding window) + current. Smooth like a sliding log, O(1) like a fixed window, and without the
 * 2× burst a plain fixed window allows at its edge. Rejected requests count too, so a client that
 * keeps hammering stays limited.
 */

export type Rule = { limit: number; windowSec: number };

export type Verdict = {
  ok: boolean;
  /** Seconds until a new request would pass (only meaningful when !ok). */
  retryAfter: number;
  backend: "kv" | "memory";
};

/* ── in-memory backend ── */

const MAX_KEYS = 5_000;
type Slot = { idx: number; cur: number; prev: number };
const counters = new Map<string, Slot>();

function memHit(key: string, idx: number): { cur: number; prev: number } {
  const s = counters.get(key);
  let slot: Slot;
  if (!s || s.idx < idx - 1) slot = { idx, cur: 0, prev: 0 };
  else if (s.idx === idx - 1) slot = { idx, cur: 0, prev: s.cur };
  else slot = s;
  slot.cur += 1;
  // Re-insert so Map order is least-recently-used first; evict from the front past the bound.
  counters.delete(key);
  counters.set(key, slot);
  while (counters.size > MAX_KEYS) counters.delete(counters.keys().next().value as string);
  return { cur: slot.cur, prev: slot.prev };
}

const marks = new Map<string, number>();

function memClaim(key: string, ttlSec: number, now: number): boolean {
  const exp = marks.get(key);
  if (exp !== undefined && exp > now) return false;
  marks.delete(key);
  marks.set(key, now + ttlSec * 1000);
  while (marks.size > MAX_KEYS) marks.delete(marks.keys().next().value as string);
  return true;
}

/* ── evaluation ── */

/** Seconds until prev·(1−f) + cur ≤ limit − 1 (room for one more request), assuming no new hits. */
function waitSeconds(rule: Rule, cur: number, prev: number, frac: number): number {
  const W = rule.windowSec;
  const room = rule.limit - 1;
  let t: number;
  if (cur <= room && prev > 0) {
    // still inside this window: wait for the previous window's weight to fade enough
    t = (1 - (room - cur) / prev - frac) * W;
  } else {
    // only after this window ends, while this window's count fades as "previous"
    t = (1 - frac) * W + Math.max(0, 1 - room / cur) * W;
  }
  return Math.max(1, Math.ceil(t));
}

function judge(rules: Rule[], counts: { cur: number; prev: number }[], now: number): { ok: boolean; retryAfter: number } {
  let ok = true;
  let retryAfter = 0;
  rules.forEach((rule, i) => {
    const W = rule.windowSec * 1000;
    const frac = (now % W) / W;
    const { cur, prev } = counts[i];
    if (prev * (1 - frac) + cur > rule.limit) {
      ok = false;
      retryAfter = Math.max(retryAfter, waitSeconds(rule, cur, prev, frac));
    }
  });
  return { ok, retryAfter };
}

/**
 * Counts one hit for `id` under every rule of `scope` and says whether it is allowed.
 * Never throws and never blocks because of an infrastructure error.
 */
export async function rateLimit(scope: string, id: string, rules: Rule[]): Promise<Verdict> {
  const now = Date.now();
  const keys = rules.map((r) => {
    const idx = Math.floor(now / (r.windowSec * 1000));
    const base = `rl:${scope}:${r.windowSec}:${id}`;
    return { idx, cur: `${base}:${idx}`, prev: `${base}:${idx - 1}`, mem: `${scope}:${r.windowSec}:${id}` };
  });

  if (kvConfigured()) {
    const cmds = keys.flatMap((k, i) => [
      ["INCR", k.cur],
      ["EXPIRE", k.cur, rules[i].windowSec * 2],
      ["GET", k.prev],
    ]);
    const out = await kvPipeline(cmds);
    if (out) {
      const counts = keys.map((_, i) => ({ cur: Number(out[i * 3]) || 0, prev: Number(out[i * 3 + 2]) || 0 }));
      return { ...judge(rules, counts, now), backend: "kv" };
    }
  }
  const counts = keys.map((k) => memHit(k.mem, k.idx));
  return { ...judge(rules, counts, now), backend: "memory" };
}

/**
 * Atomically claims `key` for `ttlSec` (Redis SET NX EX). True the first time, false while the
 * claim is alive. Used for duplicate detection; release() undoes a claim whose work failed.
 */
export async function claimOnce(key: string, ttlSec: number): Promise<boolean> {
  if (kvConfigured()) {
    const out = await kvPipeline([["SET", `once:${key}`, "1", "EX", ttlSec, "NX"]]);
    if (out) return out[0] === "OK";
  }
  return memClaim(key, ttlSec, Date.now());
}

export async function release(key: string): Promise<void> {
  marks.delete(key);
  if (kvConfigured()) await kvPipeline([["DEL", `once:${key}`]]);
}
