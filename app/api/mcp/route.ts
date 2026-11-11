import { MAX_BODY, handleMessage, httpError, type Reply } from "@/lib/pulso/mcp";
import { allowedOrigins, siteOrigin } from "@/lib/pulso/site";

/**
 * MCP endpoint of the Pulso demo store (Streamable HTTP, stateless, JSON responses).
 * Public and read-only apart from stateless checkout tokens; no auth by design.
 */

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
      return send(httpError(400, -32700, "Parse error: JSON inválido."));
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
