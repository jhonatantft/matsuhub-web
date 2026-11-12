/**
 * Model Context Protocol server for the Pulso demo, Streamable HTTP, JSON responses, stateless.
 *
 * Dual-era (spec 2026-07-28 § Versioning): requests carrying `_meta`
 * "io.modelcontextprotocol/protocolVersion" are served as revision 2026-07-28 (per-request
 * metadata, server/discover, Mcp-Method/Mcp-Name headers, resultType); an `initialize` request
 * selects legacy semantics (2025-11-25 / 2025-06-18 / 2025-03-26) without minting sessions.
 */
import { PULSO } from "@/content/pulso";
import { UcpDiscoveryError, callTool, toolList } from "./tools";
import { PULSO_PATHS } from "./site";

export const MODERN = "2026-07-28";
export const LEGACY = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
export const SUPPORTED = [MODERN, ...LEGACY];
export const MAX_BODY = 64 * 1024;

const K = {
  version: "io.modelcontextprotocol/protocolVersion",
  caps: "io.modelcontextprotocol/clientCapabilities",
  server: "io.modelcontextprotocol/serverInfo",
} as const;

export const SERVER_INFO = { name: "pulso-store", title: `${PULSO.name} · loja de demonstração`, version: "1.0.0" };

const INSTRUCTIONS =
  "Loja fictícia de áudio (Pulso), demonstração da MatsuHub. Use search_products para achar produtos, get_product e check_inventory para detalhes, get_shipping_quote para frete e as ferramentas UCP (create_checkout → update_checkout com endereço → complete_checkout) para comprar. O pedido final é simulado: nenhum pagamento é processado; nunca envie dados de pagamento.";

export type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

type Id = string | number;
const err = (id: Id | null, code: number, message: string, data?: unknown) => ({
  jsonrpc: "2.0" as const,
  ...(id === null ? {} : { id }),
  error: { code, message, ...(data === undefined ? {} : { data }) },
});
const ok = (id: Id, result: unknown) => ({ jsonrpc: "2.0" as const, id, result });

export const httpError = (status: number, code: number, message: string): Reply => ({ status, body: err(null, code, message) });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/* ── Rate-limit hooks (used by app/api/mcp/route.ts) ── */

/** Tools that mint or change checkout state: limited more strictly than the read-only ones. */
export const CHECKOUT_TOOLS: ReadonlySet<string> = new Set(["create_checkout", "update_checkout", "complete_checkout", "cancel_checkout"]);

/**
 * JSON-RPC error code for "rate limited". MCP 2026-07-28 (basic § Error Codes) defines none,
 * reserves -32020…-32099 for the spec, discourages -32000…-32019 for new code, and says new codes
 * SHOULD live outside JSON-RPC's reserved -32768…-32000. Hence an application code; the "429"
 * suffix mirrors the HTTP status. Clients should key on HTTP 429 + Retry-After.
 */
export const RATE_LIMITED = -31429;

/** What a limiter needs from a parsed message: its id (if usable) and the tool name of a tools/call. */
export function peek(msg: unknown): { id: Id | null; tool: string | null } {
  if (!isObj(msg)) return { id: null, tool: null };
  const id = msg.id;
  const validId = (typeof id === "string" && id.length <= 200) || (typeof id === "number" && Number.isInteger(id)) ? (id as Id) : null;
  const tool = msg.method === "tools/call" && isObj(msg.params) && typeof msg.params.name === "string" ? msg.params.name : null;
  return { id: validId, tool };
}

/** HTTP 429 + Retry-After with a JSON-RPC error that echoes the request id when there is one. */
export const rateLimitedReply = (id: Id | null, retryAfter: number, scope: "requests" | "checkout"): Reply => ({
  status: 429,
  body: err(
    id,
    RATE_LIMITED,
    `Rate limit excedido (${scope === "checkout" ? "ferramentas de checkout" : "requisições"} por IP). Tente de novo em ${retryAfter} s.`,
    { retryAfterSeconds: retryAfter, scope },
  ),
  headers: { "Retry-After": String(retryAfter) },
});

const decodeHeader = (v: string) => {
  const m = v.match(/^=\?base64\?([A-Za-z0-9+/=]*)\?=$/);
  if (!m) return v;
  try {
    return Buffer.from(m[1], "base64").toString("utf8");
  } catch {
    return null;
  }
};

/** Handles one parsed JSON-RPC message. */
export function handleMessage(msg: unknown, headers: Headers, origin: string): Reply {
  if (Array.isArray(msg)) {
    return httpError(400, -32600, "Batch JSON-RPC não é suportado: envie uma mensagem por requisição.");
  }
  if (!isObj(msg) || msg.jsonrpc !== "2.0") return httpError(400, -32600, 'Requisição inválida: esperado objeto JSON-RPC 2.0 ("jsonrpc": "2.0").');
  if ("result" in msg || "error" in msg) return httpError(400, -32600, "Este servidor não aceita respostas JSON-RPC do cliente.");
  if (typeof msg.method !== "string" || msg.method.length === 0 || msg.method.length > 100) {
    return httpError(400, -32600, 'Requisição inválida: "method" ausente.');
  }
  const method = msg.method;
  const params = msg.params === undefined ? {} : msg.params;
  if (!isObj(params)) return httpError(400, -32600, '"params" deve ser um objeto.');

  // Notification (no id): accept and answer 202 with no body.
  if (!("id" in msg)) return { status: 202 };
  const id = msg.id;
  if (!(typeof id === "string" && id.length <= 200) && !(typeof id === "number" && Number.isInteger(id))) {
    return httpError(400, -32600, '"id" deve ser string ou inteiro (não nulo).');
  }

  const meta = isObj(params._meta) ? params._meta : undefined;
  const headerVersion = headers.get("mcp-protocol-version");

  /* ── Modern (2026-07-28): per-request metadata ── */
  if (method !== "initialize" && meta && K.version in meta) {
    const version = meta[K.version];
    if (typeof version !== "string") return { status: 400, body: err(id, -32602, `_meta["${K.version}"] deve ser string.`) };
    if (headerVersion === null || headerVersion !== version) {
      return { status: 400, body: err(id, -32020, `Header mismatch: MCP-Protocol-Version '${headerVersion ?? "(ausente)"}' difere de _meta '${version}'.`) };
    }
    if (version !== MODERN) {
      return {
        status: 400,
        body: err(id, -32022, "Unsupported protocol version", { supported: SUPPORTED, requested: version }),
      };
    }
    if (!isObj(meta[K.caps])) {
      return { status: 400, body: err(id, -32602, `_meta["${K.caps}"] é obrigatório (objeto).`) };
    }
    const hMethod = headers.get("mcp-method");
    if (hMethod !== method) {
      return { status: 400, body: err(id, -32020, `Header mismatch: Mcp-Method '${hMethod ?? "(ausente)"}' difere do corpo '${method}'.`) };
    }
    if (method === "tools/call") {
      const raw = headers.get("mcp-name");
      const hName = raw === null ? null : decodeHeader(raw);
      if (hName !== params.name) {
        return { status: 400, body: err(id, -32020, `Header mismatch: Mcp-Name '${hName ?? "(ausente)"}' difere do corpo '${String(params.name)}'.`) };
      }
    }
    return dispatch(id, method, params, origin, true);
  }

  /* ── Legacy (initialize handshake era) ── */
  if (method === "initialize") {
    const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : null;
    if (!requested || !isObj(params.capabilities) || !isObj(params.clientInfo)) {
      return { status: 400, body: err(id, -32602, "initialize requer protocolVersion, capabilities e clientInfo.") };
    }
    const chosen = (LEGACY as readonly string[]).includes(requested) ? requested : LEGACY[0];
    return {
      status: 200,
      body: ok(id, {
        protocolVersion: chosen,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: `${INSTRUCTIONS} (Este servidor também fala a revisão ${MODERN}, sem handshake.)`,
      }),
    };
  }
  // Legacy requests after initialize: header optional (absent = 2025-03-26), must be known if present.
  if (headerVersion !== null && !(LEGACY as readonly string[]).includes(headerVersion)) {
    return {
      status: 400,
      body: err(id, -32022, "Unsupported protocol version", { supported: SUPPORTED, requested: headerVersion }),
    };
  }
  if (method === "ping") return { status: 200, body: ok(id, {}) };
  return dispatch(id, method, params, origin, false);
}

function dispatch(id: Id, method: string, params: Record<string, unknown>, origin: string, modern: boolean): Reply {
  const wrap = (result: Record<string, unknown>) =>
    modern ? { resultType: "complete", ...result, _meta: { [K.server]: SERVER_INFO } } : result;

  switch (method) {
    case "server/discover":
      if (!modern) break;
      return {
        status: 200,
        body: ok(
          id,
          wrap({
            supportedVersions: SUPPORTED,
            capabilities: { tools: { listChanged: false } },
            instructions: INSTRUCTIONS,
            ttlMs: 3_600_000,
            cacheScope: "public",
          }),
        ),
      };
    case "tools/list":
      return {
        status: 200,
        body: ok(id, wrap(modern ? { tools: toolList(), ttlMs: 300_000, cacheScope: "public" } : { tools: toolList() })),
      };
    case "tools/call": {
      if (typeof params.name !== "string") return { status: 400, body: err(id, -32602, 'tools/call requer "name" (string).') };
      try {
        const r = callTool(params.name, params.arguments, origin);
        if (!r) return { status: 200, body: err(id, -32602, `Unknown tool: ${params.name}`) };
        return {
          status: 200,
          body: ok(
            id,
            wrap({
              content: [{ type: "text", text: JSON.stringify(r.structured) }],
              structuredContent: r.structured,
              isError: r.isError === true,
            }),
          ),
        };
      } catch (e) {
        if (e instanceof UcpDiscoveryError) {
          return {
            status: modern ? 400 : 200,
            body: err(id, -32001, e.message, { code: e.code, continue_url: origin + PULSO_PATHS.store }),
          };
        }
        console.error("[pulso/mcp] tool failure", params.name, e);
        return { status: 500, body: err(id, -32603, "Erro interno ao executar a ferramenta.") };
      }
    }
  }
  return { status: modern ? 404 : 200, body: err(id, -32601, `Method not found: ${method}`) };
}
