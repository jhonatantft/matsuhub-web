import "server-only";
import { createHmac, randomBytes } from "node:crypto";

/**
 * Client IP for rate limiting, and a keyed hash of it so raw IPs never reach logs, Redis or the DB.
 *
 * On Vercel the edge overwrites `x-forwarded-for` / `x-real-ip` and sets `x-vercel-forwarded-for`
 * itself, so clients cannot spoof them (https://vercel.com/docs/headers/request-headers).
 * `x-vercel-forwarded-for` wins because `x-forwarded-for` could be rewritten by a proxy placed in
 * front of Vercel. Off Vercel (local `next dev`) these headers are client-controlled: fine for
 * development, not a security boundary. Self-hosting behind another proxy needs its own rule here.
 */

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:.]{2,45}$/i;

function clean(raw: string | null): string | null {
  if (!raw) return null;
  let v = raw.split(",")[0].trim().toLowerCase();
  if (v.startsWith("[")) {
    const end = v.indexOf("]"); // [::1]:port
    v = end === -1 ? v.slice(1) : v.slice(1, end);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(v)) v = v.slice(0, v.lastIndexOf(":")); // 1.2.3.4:port
  if (v.startsWith("::ffff:") && IPV4.test(v.slice(7))) v = v.slice(7); // IPv4-mapped IPv6
  if (IPV4.test(v)) return v;
  if (v.includes(":") && IPV6.test(v)) return v;
  return null;
}

/** The caller's IP, or "unknown" when no trustworthy header carries one. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return clean(h.get("x-vercel-forwarded-for")) ?? clean(h.get("x-real-ip")) ?? clean(h.get("x-forwarded-for")) ?? "unknown";
}

/** Expands an IPv6 address to 8 groups (no validation beyond what clean() did). */
function expand6(ip: string): string[] {
  const [head, tail = ""] = ip.split("::");
  const a = head ? head.split(":") : [];
  const b = ip.includes("::") && tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...a, ...Array<string>(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b] : a;
  return groups.map((g) => (g.includes(".") ? g : g.replace(/^0+(?=.)/, "")));
}

/**
 * The unit we count: an IPv4 address, or the /64 prefix of an IPv6 address (one ISP customer
 * usually gets a whole /64, so per-address IPv6 limits are trivial to dodge).
 */
export function ipBucket(ip: string): string {
  if (ip === "unknown" || IPV4.test(ip)) return ip;
  return `${expand6(ip).slice(0, 4).join(":")}::/64`;
}

let processSecret: string | null = null;

/**
 * Secret for the IP hash. IP_HASH_SECRET first; then the Supabase service key or the KV token
 * (stable secrets that already exist), so hashes match across instances and deploys. Without
 * any of them, a random per-process secret: hashes are then only comparable inside one instance,
 * which is all the in-memory limiter needs.
 */
function secret(): string {
  return (
    process.env.IP_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    (processSecret ??= randomBytes(32).toString("hex"))
  );
}

/** HMAC-SHA256 (hex) of the caller's IP bucket. One-way: the raw IP is never stored. */
export function hashIp(ip: string): string {
  return createHmac("sha256", secret()).update(ipBucket(ip)).digest("hex");
}

/** Short, non-reversible tag for log lines (first 10 hex chars of the hash). */
export const logTag = (ipHash: string) => ipHash.slice(0, 10);

/** Keyed hash of arbitrary text (duplicate detection without keeping contacts in Redis). */
export function hashText(text: string): string {
  return createHmac("sha256", secret()).update(text).digest("hex").slice(0, 40);
}
