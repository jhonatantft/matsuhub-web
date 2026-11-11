/**
 * Debug overrides read from the URL, client only. They make any page deterministic
 * for headless screenshots (scripts/shot.sh):
 *   ?t=3.2   freeze animation time at 3.2 s (lib/ticker)
 *   ?p=0.5   force the progress of pinned scroll scenes (lib/scroll pinProgress)
 *   ?y=1200  jump to a scroll offset on load (components/layout/SmoothScroll)
 */
const cache = new Map<string, number | null>();

export function labParam(name: string): number | null {
  if (typeof window === "undefined") return null;
  if (cache.has(name)) return cache.get(name)!;
  const raw = new URLSearchParams(window.location.search).get(name);
  const n = raw === null || raw === "" ? NaN : Number(raw);
  const value = Number.isFinite(n) ? n : null;
  cache.set(name, value);
  return value;
}
