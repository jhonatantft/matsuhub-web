/**
 * The steps of loading a page, read from the browser's Navigation Timing entry, and the distance
 * a round trip allows. Pure: hand it the entry's numbers, get phases back.
 */

export const PHASE_IDS = ["prep", "dns", "tcp", "tls", "wait", "download", "build", "rest"] as const;
export type PhaseId = (typeof PHASE_IDS)[number];
export type Phase = { id: PhaseId; start: number; end: number };

/** The fields of a PerformanceNavigationTiming we use (all in ms since navigation start). */
export type NavLike = {
  name: string;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domContentLoadedEventEnd: number;
  loadEventEnd: number;
  nextHopProtocol: string;
};

export type Timeline = { phases: Phase[]; total: number; protocol: string; url: string };

export function timelineOf(n: NavLike): Timeline {
  const tlsStart = n.secureConnectionStart > 0 ? n.secureConnectionStart : n.connectEnd;
  const built = n.domContentLoadedEventEnd || n.responseEnd;
  const done = n.loadEventEnd || built;
  const span = (id: PhaseId, start: number, end: number): Phase => ({ id, start, end: Math.max(start, end) });
  const phases = [
    span("prep", 0, n.domainLookupStart),
    span("dns", n.domainLookupStart, n.domainLookupEnd),
    span("tcp", n.connectStart, tlsStart),
    span("tls", tlsStart, n.connectEnd),
    span("wait", n.requestStart, n.responseStart),
    span("download", n.responseStart, n.responseEnd),
    span("build", n.responseEnd, built),
    span("rest", built, done),
  ];
  return { phases, total: Math.max(1, done), protocol: n.nextHopProtocol, url: n.name };
}

/** Readable protocol: "h2" → "HTTP/2", "h3" → "HTTP/3". */
export const protocolName = (p: string) => (p === "h2" ? "HTTP/2" : p === "h3" ? "HTTP/3" : p.startsWith("http/") ? p.toUpperCase() : p || "HTTP");

/** "gru1::iad1::abc-123" → "gru": the edge that answered. */
export const regionOf = (vercelId: string | null) => (vercelId ? (/^([a-z]{3})\d/.exec(vercelId)?.[1] ?? null) : null);

/** Light in fibre: ~200 km per ms; a round trip of `ms` reaches at most ms × 100 km away. */
export const maxKmOf = (rttMs: number) => rttMs * 100;

export const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function formatMs(ms: number, lang: "pt" | "en"): string {
  const locale = lang === "pt" ? "pt-BR" : "en-US";
  if (ms >= 1000) return `${(ms / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} s`;
  return `${Math.round(ms).toLocaleString(locale)} ms`;
}

export const formatKm = (km: number, lang: "pt" | "en") =>
  `${(km >= 100 ? Math.round(km / 10) * 10 : Math.round(km)).toLocaleString(lang === "pt" ? "pt-BR" : "en-US")} km`;
