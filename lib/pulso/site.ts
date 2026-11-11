/**
 * Absolute URLs for the Pulso agent endpoints (server-only helpers).
 * NEXT_PUBLIC_SITE_URL wins; otherwise the request's own origin.
 */

const fromEnv = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

/** Origin used to build absolute URLs in responses. */
export function siteOrigin(request?: Request): string {
  const env = fromEnv();
  if (env) return env;
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      /* fall through */
    }
  }
  return "http://localhost:3000";
}

/** Origins a browser may call the MCP endpoint from: this site only. */
export function allowedOrigins(request: Request): Set<string> {
  const set = new Set<string>();
  const env = fromEnv();
  if (env) set.add(env);
  try {
    set.add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }
  // Behind a proxy the request URL may carry the internal host; trust the forwarded host only
  // to compare against the browser's Origin (never to build URLs for other clients).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    set.add(`${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`);
  }
  return set;
}

export const PULSO_PATHS = {
  store: "/demos/ecommerce",
  mcp: "/api/mcp",
  ucp: "/.well-known/ucp",
  agentProfile: "/api/mcp/agent-profile",
  llms: "/llms.txt",
} as const;
