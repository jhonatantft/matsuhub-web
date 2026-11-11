import { labParam } from "./lab";

/**
 * `time` in seconds since page load, `dt` in seconds (capped at 50 ms).
 * With `?t=N` in the URL, `time` is frozen at N and `dt` is 1, so `damp()` snaps to its
 * target: derive animation state from `time`, don't accumulate `dt`.
 */
export type FrameFn = (time: number, dt: number) => void;

const subs = new Set<FrameFn>();
let raf = 0;
let last = 0;

function loop(ms: number) {
  raf = requestAnimationFrame(loop);
  const now = ms / 1000;
  const forced = labParam("t");
  const dt = forced !== null ? 1 : last ? Math.min(0.05, now - last) : 1 / 60;
  last = now;
  const time = forced ?? now;
  for (const fn of subs) fn(time, dt);
}

/**
 * The one shared animation loop. Every animated thing subscribes here instead of
 * calling requestAnimationFrame itself, so `?t=` can freeze time for screenshots.
 * Returns an unsubscribe function — call it on unmount.
 */
export function onFrame(fn: FrameFn): () => void {
  subs.add(fn);
  if (subs.size === 1) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  return () => {
    subs.delete(fn);
    if (subs.size === 0) cancelAnimationFrame(raf);
  };
}
