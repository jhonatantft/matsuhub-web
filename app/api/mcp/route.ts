import { clientIp, hashIp } from "@/lib/guard/ip";
import { rateLimit, type Rule } from "@/lib/guard/limiter";
import { CHECKOUT_TOOLS, MAX_BODY, handleMessage, httpError, peek, rateLimitedReply, type Reply } from "@/lib/pulso/mcp";
import { allowedOrigins, siteOrigin } from "@/lib/pulso/site";

/**
 * MCP endpoint of the Pulso demo store (Streamable HTTP, stateless, JSON responses).
 * Public and read-only apart from stateless checkout tokens; no auth by design.
 *
 * Rate limits (MCP tools spec: servers MUST rate limit tool invocations), per client IP
 * (IPv6: per /64), sliding window, lib/guard/limiter.ts:
 *   - every POST:                       120 per minute
 *   - tools/call of a checkout tool:     20 per minute (create/update/complete/cancel_checkout)
 * Over a limit: HTTP 429, Retry-After, and a JSON-RPC error (code RATE_LIMITED) carrying the
 * request id when the body had a valid one (no id for notifications or unparseable bodies).
 */

const ALL: Rule[] = [{ limit: 120, windowSec: 60 }];
const CHECKOUT: Rule[] = [{ limit: 20, windowSec: 60 }];

const send = ({ status, body, headers }: Reply) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json; charset=utf-8" }),
      "Cache-Control": "no-store",
      ...headers,
    },
  });

/** Reads the body, aborting once it exceeds `limit` bytes (works for chunked bodies too). */
async function readCapped(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request) {
  try {
    // Every POST counts, including the ones rejected below; the verdict is awaited once the
    // body is parsed so a 429 can echo the JSON-RPC id.
    const who = hashIp(clientIp(request)).slice(0, 32);
    const verdictP = rateLimit("mcp", who, ALL);
    const origin = request.headers.get("origin");
    if (origin !== null && !allowedOrigins(request).has(origin)) {
      return send(httpError(403, -32600, "Origin não permitida: este endpoint aceita chamadas do próprio site ou de clientes fora do navegador."));
    }
    const type = request.headers.get("content-type") ?? "";
    if (!/^application\/json\b/i.test(type)) {
      return send(httpError(415, -32600, "Content-Type deve ser application/json."));
    }
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_BODY) return send(httpError(413, -32600, `Corpo acima de ${MAX_BODY / 1024} KB.`));
    const text = await readCapped(request, MAX_BODY);
    if (text === null) return send(httpError(413, -32600, `Corpo acima de ${MAX_BODY / 1024} KB.`));

    let msg: unknown;
    try {
      msg = JSON.parse(text);
    } catch {
      const verdict = await verdictP;
      if (!verdict.ok) return send(rateLimitedReply(null, verdict.retryAfter, "requests"));
      return send(httpError(400, -32700, "Parse error: JSON inválido."));
    }
    const { id, tool } = peek(msg);
    const verdict = await verdictP;
    if (!verdict.ok) return send(rateLimitedReply(id, verdict.retryAfter, "requests"));
    if (tool !== null && CHECKOUT_TOOLS.has(tool)) {
      const strict = await rateLimit("mcp-checkout", who, CHECKOUT);
      if (!strict.ok) return send(rateLimitedReply(id, strict.retryAfter, "checkout"));
    }
    return send(handleMessage(msg, request.headers, siteOrigin(request)));
  } catch (e) {
    console.error("[pulso/mcp] unexpected", e);
    return send(httpError(500, -32603, "Erro interno."));
  }
}

const notAllowed = () =>
  send({
    status: 405,
    body: { jsonrpc: "2.0", error: { code: -32600, message: "Método HTTP não permitido: use POST (MCP Streamable HTTP, sem stream GET)." } },
    headers: { Allow: "POST" },
  });

export const GET = notAllowed;
export const DELETE = notAllowed;
