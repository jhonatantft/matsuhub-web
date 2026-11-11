"use client";

import { useRef, useState } from "react";
import { useOrigin } from "./ExchangeView";
import { MCP_PATH, UCP_PATH } from "./mcpClient";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <button
      type="button"
      disabled={!text}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked: the text stays selectable */
        }
      }}
      className="shrink-0 rounded-lg border border-pu-line bg-pu-bg-2 px-3 py-1.5 font-mono text-[12px] text-pu-ink transition-colors hover:border-pu-acc focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pu-acc disabled:opacity-40"
    >
      <span aria-live="polite">{done ? "copiado" : "copiar"}</span>
    </button>
  );
}

export function ConnectPanel() {
  const origin = useOrigin();
  const endpoint = origin ? origin + MCP_PATH : "";
  const config = JSON.stringify({ mcpServers: { pulso: { type: "http", url: endpoint || `…${MCP_PATH}` } } }, null, 2);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-pu-line bg-pu-bg-2 p-5 sm:p-6">
        <h3 className="font-pulso text-[19px] font-semibold text-pu-ink">Conecte o seu assistente</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-pu-mute">
          Qualquer cliente MCP compatível (assistentes de IA, IDEs, agentes próprios) pode usar a loja com este endereço. Não precisa de chave.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-pu-mute">Endpoint MCP</p>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-pu-line bg-pu-bg px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-pu-ink" data-mcp-endpoint>
            {endpoint || "…"}
          </code>
          <CopyButton text={endpoint} label="Copiar endereço do endpoint MCP" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={UCP_PATH}
            target="_blank"
            rel="noopener"
            className="rounded-full border border-pu-line px-3.5 py-1.5 font-mono text-[12.5px] text-pu-ink hover:border-pu-acc focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pu-acc"
          >
            /.well-known/ucp ↗<span className="sr-only"> (abre em nova aba)</span>
          </a>
          <a
            href="/llms.txt"
            target="_blank"
            rel="noopener"
            className="rounded-full border border-pu-line px-3.5 py-1.5 font-mono text-[12.5px] text-pu-ink hover:border-pu-acc focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pu-acc"
          >
            /llms.txt ↗<span className="sr-only"> (abre em nova aba)</span>
          </a>
        </div>
        <p className="mt-5 rounded-xl bg-pu-bg px-3.5 py-3 text-[13px] leading-relaxed text-pu-mute">
          Loja de demonstração: a Pulso é fictícia, nenhum pagamento é processado e nenhum pedido é enviado. A integração UCP é uma implementação de demonstração, não certificada.
        </p>
      </div>

      <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0c0d12] p-5 text-white sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">Configuração do cliente</p>
          <CopyButton text={endpoint ? config : ""} label="Copiar configuração do cliente MCP" />
        </div>
        <pre className="mt-3 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-[#b9f3ff]/90">{config}</pre>
        <p className="mt-4 text-[12.5px] leading-relaxed text-white/50">
          Formato genérico usado por vários clientes; o nome do campo pode mudar de um cliente para outro. Transporte: Streamable HTTP, respostas JSON, sem sessão.
        </p>
      </div>
    </div>
  );
}
