import "server-only";

/**
 * Same-origin check for browser form posts (CSRF-style abuse: a third-party page making its
 * visitors' browsers post to us, which also spreads the traffic over many IPs).
 *
 * The allowed hosts live HERE and nowhere else:
 *  - production domains (SITE_HOSTS);
 *  - the current Vercel deployment's own hosts, from Vercel's system env vars (VERCEL_URL,
 *    VERCEL_BRANCH_URL, VERCEL_PROJECT_PRODUCTION_URL) — this is how previews of THIS project are
 *    allowed. A `*.vercel.app` wildcard (or `matsuhub-web-*.vercel.app`) is deliberately NOT
 *    used: anyone can create a Vercel project whose URL matches such a pattern;
 *  - NEXT_PUBLIC_SITE_URL's host;
 *  - outside production: localhost, 127.0.0.1 and [::1] on any port.
 */

export const SITE_HOSTS = ["www.matsuhub.com", "matsuhub.com"] as const;

const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const isProd = () => process.env.NODE_ENV === "production";

function hostOf(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).host.toLowerCase();
  } catch {
    return null;
  }
}

export function allowedHosts(): Set<string> {
  const set = new Set<string>(SITE_HOSTS);
  for (const v of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]) {
    const h = hostOf(v);
    if (h) set.add(h);
  }
  return set;
}

/** True when `origin` (scheme://host[:port]) is one of ours. */
export function isAllowedOrigin(origin: string): boolean {
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (!isProd() && DEV_HOSTNAMES.has(u.hostname) && (u.protocol === "http:" || u.protocol === "https:")) return true;
  if (u.protocol !== "https:" && isProd()) return false;
  return allowedHosts().has(u.host.toLowerCase());
}

export type OriginVerdict = { ok: true; browser: boolean } | { ok: false; reason: string };

/**
 * Accepts:
 *  - browser requests whose Origin is ours (and not flagged `Sec-Fetch-Site: cross-site`);
 *  - non-browser requests (curl, server-to-server): no Origin AND no Sec-Fetch-Site. A Referer,
 *    if present, must then be ours too.
 * Rejects everything else, including `Origin: null` (sandboxed iframes, file://). Modern browsers
 * always send Origin on POST, so "Sec-Fetch-* present but no Origin" is not a real browser form.
 * `browser` tells the caller whether the request came from a browser.
 */
export function checkSameOrigin(req: Request): OriginVerdict {
  const h = req.headers;
  const origin = h.get("origin");
  const site = h.get("sec-fetch-site");
  if (origin !== null) {
    if (!isAllowedOrigin(origin)) return { ok: false, reason: "origin" };
    if (site === "cross-site") return { ok: false, reason: "sec-fetch-site" };
    return { ok: true, browser: true };
  }
  if (site !== null) return { ok: false, reason: "sec-fetch-site-without-origin" };
  const referer = h.get("referer");
  if (referer !== null) {
    let refOrigin: string;
    try {
      refOrigin = new URL(referer).origin;
    } catch {
      return { ok: false, reason: "referer" };
    }
    if (!isAllowedOrigin(refOrigin)) return { ok: false, reason: "referer" };
  }
  return { ok: true, browser: false };
}
