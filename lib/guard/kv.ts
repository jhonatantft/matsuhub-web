import "server-only";

/**
 * Minimal Upstash Redis / Vercel KV client over the REST API (no SDK, plain fetch).
 * Configured by UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or the names the Vercel
 * Marketplace integration creates, KV_REST_API_URL + KV_REST_API_TOKEN.
 *
 * Every call has a short timeout and never throws: on any failure it returns null and the
 * callers fall back to their in-memory path (fail OPEN — a store outage must never block real
 * visitors). After a failure the store is skipped for a while so each request doesn't pay the
 * timeout again.
 */

const TIMEOUT_MS = 800;
const COOLDOWN_MS = 30_000;

let downUntil = 0;
let lastWarn = 0;

type Cmd = (string | number)[];
type Item = { result?: unknown; error?: string };

function config(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export const kvConfigured = () => config() !== null;

function warn(why: string) {
  const now = Date.now();
  if (now - lastWarn < 60_000) return;
  lastWarn = now;
  console.warn(`[guard/kv] store unavailable (${why}); using the in-memory fallback for ${COOLDOWN_MS / 1000}s`);
}

/** Runs the commands in one /pipeline round trip. Results in order, or null on any failure. */
export async function kvPipeline(cmds: Cmd[]): Promise<unknown[] | null> {
  const cfg = config();
  if (!cfg || Date.now() < downUntil) return null;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds.map((c) => c.map(String))),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const items = (await res.json()) as Item[];
    if (!Array.isArray(items) || items.length !== cmds.length || items.some((i) => i?.error)) throw new Error("bad reply");
    return items.map((i) => i.result ?? null);
  } catch (e) {
    downUntil = Date.now() + COOLDOWN_MS;
    warn(e instanceof Error ? e.name === "TimeoutError" ? "timeout" : e.message.slice(0, 80) : "error");
    return null;
  }
}
