"use client";

import { useState } from "react";
import { ExchangeView, useOrigin } from "./ExchangeView";
import { AGENT_PROFILE_PATH, type Exchange, callTool, legacyInitialize, mcp, uuid } from "./mcpClient";

const TOOL_NAMES = [
  "search_products",
  "get_product",
  "check_inventory",
  "get_shipping_quote",
  "create_checkout",
  "get_checkout",
  "update_checkout",
  "complete_checkout",
  "cancel_checkout",
] as const;
type ToolName = (typeof TOOL_NAMES)[number];

/** Placeholder swapped for a fresh UUID when the request is sent. */
const AUTO_KEY = "(gerado ao enviar)";

/** Editable starting arguments for each tool. */
function template(name: ToolName, origin: string, checkoutId: string) {
  const meta = { "ucp-agent": { profile: origin + AGENT_PROFILE_PATH } };
  const id = checkoutId || "cole aqui o id devolvido por create_checkout";
  const line = { line_items: [{ item: { id: "buds" }, quantity: 1 }] };
  const args: Record<ToolName, unknown> = {
    search_products: { query: "fone com cancelamento de ruído para viagem", limit: 3 },
    get_product: { product_id: "one" },
    check_inventory: { product_id: "bar", quantity: 2 },
    get_shipping_quote: { items: [{ product_id: "case", quantity: 1 }], postal_code: "88010-000" },
    create_checkout: { meta, checkout: line },
    get_checkout: { meta, id },
    update_checkout: {
      meta,
      id,
      checkout: { ...line, fulfillment: { methods: [{ type: "shipping", destinations: [{ postal_code: "01310-100", address_locality: "São Paulo", address_region: "SP", address_country: "BR" }] }] } },
    },
    complete_checkout: { meta: { ...meta, "idempotency-key": AUTO_KEY }, id, checkout: {} },
    cancel_checkout: { meta: { ...meta, "idempotency-key": AUTO_KEY }, id },
  };
  return JSON.stringify(args[name], null, 2);
}

const lastCheckoutId = (log: Exchange[]) => {
  for (const x of log) {
    const id = (x.response as { result?: { structuredContent?: { id?: unknown } } } | null)?.result?.structuredContent?.id;
    if (typeof id === "string" && id.startsWith("chk_")) return id;
  }
  return "";
};

const btn =
  "rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 font-mono text-[12.5px] text-white transition-colors hover:border-[#00c8f0]/60 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c8f0] disabled:opacity-40";

export function AgentConsole() {
  const origin = useOrigin();
  const [log, setLog] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState<ToolName>("search_products");
  const [args, setArgs] = useState<string | null>(null);
  const [parseError, setParseError] = useState("");

  // Until the visitor edits, the box shows the template (needs the origin, known only on the client).
  const text = args ?? (origin ? template(tool, origin, lastCheckoutId(log)) : "");

  async function go(p: Promise<Exchange>) {
    setBusy(true);
    try {
      const x = await p;
      setLog((prev) => [x, ...prev].slice(0, 20));
    } finally {
      setBusy(false);
    }
  }

  function sendTool() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setParseError("JSON inválido nos argumentos: corrija antes de enviar.");
      return;
    }
    setParseError("");
    const meta = (parsed as { meta?: Record<string, unknown> } | null)?.meta;
    if (meta && meta["idempotency-key"] === AUTO_KEY) meta["idempotency-key"] = uuid();
    void go(callTool(tool, parsed));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0d12] p-4 text-white shadow-[0_30px_80px_-40px_rgba(0,200,240,0.45)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">
          Console MCP · <span className="text-[#00c8f0]">POST {origin ? `${origin}/api/mcp` : "/api/mcp"}</span>
        </p>
        {log.length > 0 && (
          <button type="button" className="font-mono text-[11px] text-white/50 underline-offset-4 hover:text-white hover:underline" onClick={() => setLog([])}>
            limpar
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="mb-2 text-[13px] text-white/60">Protocolo</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy} onClick={() => void go(mcp("server/discover"))}>
                server/discover
              </button>
              <button type="button" className={btn} disabled={busy} onClick={() => void go(legacyInitialize())}>
                initialize <span className="text-white/45">(2025-11-25)</span>
              </button>
              <button type="button" className={btn} disabled={busy} onClick={() => void go(mcp("tools/list"))}>
                tools/list
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-snug text-white/45">
              Na revisão 2026-07-28 não há handshake: cada requisição leva versão e capacidades. O initialize segue respondido para clientes antigos.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) sendTool();
            }}
          >
            <label htmlFor="pulso-console-tool" className="mb-2 block text-[13px] text-white/60">
              tools/call
            </label>
            <select
              id="pulso-console-tool"
              value={tool}
              onChange={(e) => {
                setTool(e.target.value as ToolName);
                setArgs(null);
                setParseError("");
              }}
              className="w-full rounded-lg border border-white/15 bg-[#15161d] px-3 py-2 font-mono text-[13px] text-white outline-none focus-visible:border-[#00c8f0]"
            >
              {TOOL_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <label htmlFor="pulso-console-args" className="mt-3 mb-1.5 block text-[12px] text-white/50">
              Argumentos (JSON)
            </label>
            <textarea
              id="pulso-console-args"
              value={text}
              onChange={(e) => setArgs(e.target.value)}
              spellCheck={false}
              rows={10}
              aria-invalid={parseError ? true : undefined}
              aria-describedby={parseError ? "pulso-console-err" : undefined}
              className="w-full resize-y rounded-lg border border-white/15 bg-[#15161d] px-3 py-2 font-mono text-[12px] leading-relaxed text-white/85 outline-none focus-visible:border-[#00c8f0]"
            />
            {parseError && (
              <p id="pulso-console-err" className="mt-1 text-[12px] text-amber-200">
                {parseError}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="submit" disabled={busy || !origin} className="rounded-lg bg-[#00c8f0] px-4 py-2 font-mono text-[12.5px] font-semibold text-[#0c0d12] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c8f0] disabled:opacity-40">
                Enviar
              </button>
              <button type="button" className={btn} onClick={() => setArgs(null)}>
                restaurar exemplo
              </button>
            </div>
          </form>
        </div>

        <div className="min-w-0" aria-live="polite" aria-busy={busy}>
          {log.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-[13.5px] text-white/50">
              Nada enviado ainda. Cada botão faz uma chamada de verdade a este site e mostra a requisição e a resposta completas.
            </p>
          ) : (
            <div className="space-y-2">
              {log.map((x, i) => (
                <ExchangeView key={x.key} x={x} open={i === 0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
