/**
 * Tiny browser client for the store's own MCP endpoint (revision 2026-07-28) and UCP profile.
 * Every call is a real fetch; the returned Exchange is exactly what went over the wire.
 */

export const MCP_VERSION = "2026-07-28";
export const LEGACY_VERSION = "2025-11-25";
export const MCP_PATH = "/api/mcp";
export const UCP_PATH = "/.well-known/ucp";
export const AGENT_PROFILE_PATH = "/api/mcp/agent-profile";

export type Exchange = {
  key: number;
  label: string;
  http: { method: "GET" | "POST"; url: string; headers: Record<string, string> };
  request?: unknown;
  status: number;
  ms: number;
  response: unknown;
  /** Transport or JSON-RPC level failure, or a tool result with isError / ucp.status error. */
  failed: boolean;
  error?: string;
};

let seq = 0;
const nextId = () => ++seq;

const CLIENT_INFO = { name: "pulso-console", version: "1.0.0" };

const parse = (text: string) => {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

type Rpc = { result?: Record<string, unknown>; error?: { code: number; message: string } };

/** Did this call fail at any level an agent cares about? */
function failure(status: number, body: unknown): string | undefined {
  if (status >= 400) return `HTTP ${status}`;
  const rpc = body as Rpc | null;
  if (rpc?.error) return `JSON-RPC ${rpc.error.code}: ${rpc.error.message}`;
  const r = rpc?.result;
  if (r?.isError === true) return "A ferramenta devolveu isError: true";
  const sc = r?.structuredContent as { ucp?: { status?: string }; messages?: { content?: string }[] } | undefined;
  if (sc?.ucp?.status === "error") return sc.messages?.[0]?.content ?? "UCP status: error";
  return undefined;
}

async function timed(url: string, init: RequestInit) {
  const t0 = performance.now();
  const res = await fetch(url, init);
  const text = await res.text();
  return { status: res.status, body: parse(text), ms: Math.round(performance.now() - t0) };
}

/** A modern (2026-07-28) MCP request: per-request _meta plus the mirrored HTTP headers. */
export async function mcp(method: string, params: Record<string, unknown> = {}, label = method): Promise<Exchange> {
  const id = nextId();
  const request = {
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": MCP_VERSION,
        "io.modelcontextprotocol/clientInfo": CLIENT_INFO,
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": MCP_VERSION,
    "Mcp-Method": method,
  };
  if (method === "tools/call" && typeof params.name === "string") headers["Mcp-Name"] = params.name;
  return send(label, headers, request);
}

/** The legacy handshake (2025-11-25 clients), still answered by this server. */
export async function legacyInitialize(): Promise<Exchange> {
  const request = {
    jsonrpc: "2.0",
    id: nextId(),
    method: "initialize",
    params: { protocolVersion: LEGACY_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
  };
  return send("initialize (legado)", { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, request);
}

async function send(label: string, headers: Record<string, string>, request: unknown): Promise<Exchange> {
  const url = MCP_PATH;
  try {
    const r = await timed(url, { method: "POST", headers, body: JSON.stringify(request) });
    const error = failure(r.status, r.body);
    return { key: nextId(), label, http: { method: "POST", url, headers }, request, status: r.status, ms: r.ms, response: r.body, failed: !!error, error };
  } catch (e) {
    return { key: nextId(), label, http: { method: "POST", url, headers }, request, status: 0, ms: 0, response: null, failed: true, error: `Falha de rede: ${(e as Error).message}` };
  }
}

export const callTool = (name: string, args: unknown) => mcp("tools/call", { name, arguments: args }, name);

export async function getUcpProfile(): Promise<Exchange> {
  const headers = { Accept: "application/json" };
  try {
    const r = await timed(UCP_PATH, { headers });
    const error = r.status >= 400 ? `HTTP ${r.status}` : undefined;
    return { key: nextId(), label: "GET /.well-known/ucp", http: { method: "GET", url: UCP_PATH, headers }, status: r.status, ms: r.ms, response: r.body, failed: !!error, error };
  } catch (e) {
    return { key: nextId(), label: "GET /.well-known/ucp", http: { method: "GET", url: UCP_PATH, headers }, status: 0, ms: 0, response: null, failed: true, error: `Falha de rede: ${(e as Error).message}` };
  }
}

/** structuredContent of a tools/call exchange. */
export const structured = <T,>(x: Exchange) => ((x.response as Rpc | null)?.result?.structuredContent ?? null) as T | null;

export function uuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
