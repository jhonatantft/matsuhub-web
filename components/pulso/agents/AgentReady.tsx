import { cn } from "@/lib/cn";
import { AgentConsole } from "./AgentConsole";
import { AgentRun } from "./AgentRun";
import { ConnectPanel } from "./ConnectPanel";

/**
 * "Para agentes": what MCP, UCP and structured data do for a store, a live run of an agent
 * buying through the real endpoints, a raw MCP console, and how to connect an assistant.
 * The store page owns the <section> and its id; this renders the content.
 */

const CARDS = [
  {
    tag: "MCP",
    title: "O assistente consulta a loja",
    text: "Pelo Model Context Protocol, o assistente do seu cliente busca produtos, confere estoque e calcula o frete direto no catálogo, sem abrir o site.",
  },
  {
    tag: "UCP",
    title: "E consegue fechar a compra",
    text: "O Universal Commerce Protocol padroniza o checkout para agentes: a loja publica um perfil em /.well-known/ucp e o agente monta o pedido seguindo as regras dela.",
  },
  {
    tag: "Dados estruturados",
    title: "Os buscadores entendem o catálogo",
    text: "Cada produto vai para a página com preço, moeda e disponibilidade em schema.org. Google e respostas de IA leem isso sem adivinhar.",
  },
];

function Heading({ id, n, title, sub }: { id: string; n: string; title: string; sub: string }) {
  return (
    <div className="mb-5 max-w-[62ch]">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-pu-acc">{n}</p>
      <h3 id={id} className="mt-1.5 font-pulso text-[clamp(20px,2.2vw,26px)] font-semibold tracking-[-0.01em] text-pu-ink">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-pu-mute">{sub}</p>
    </div>
  );
}

export function AgentReady({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-[var(--pad)] text-pu-ink", className)}>
      <div className="max-w-[60ch]">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pu-acc">Para agentes · MCP · UCP</p>
        <h2 className="mt-3 font-pulso text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.04] tracking-[-0.025em] text-pu-ink">
          Uma loja que os assistentes de IA sabem usar.
        </h2>
        <p className="mt-4 text-[16.5px] leading-relaxed text-pu-mute">
          O assistente do seu cliente consegue consultar o catálogo e comprar sem abrir o site. Tudo abaixo roda de verdade contra esta página: as chamadas e respostas são reais, só o pedido final é simulado.
        </p>
      </div>

      <ul className="mt-9 grid gap-3 md:grid-cols-3">
        {CARDS.map((c) => (
          <li key={c.tag} className="relative overflow-hidden rounded-2xl border border-pu-line bg-pu-bg-2 p-5">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-pu-acc via-pu-acc-2 to-transparent" />
            <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-pu-acc">{c.tag}</p>
            <h3 className="mt-2 font-pulso text-[18px] font-semibold text-pu-ink">{c.title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-pu-mute">{c.text}</p>
          </li>
        ))}
      </ul>

      <section className="mt-14" aria-labelledby="pulso-agent-run-title">
        <Heading
          id="pulso-agent-run-title"
            n="01 — Ao vivo"
            title="Ver um agente comprando"
            sub="Um agente de demonstração descobre a loja, procura o produto que a frase pede, abre o checkout UCP, calcula o frete e conclui um pedido simulado. Se uma chamada falhar, ele para e mostra o erro."
        />
        <AgentRun />
      </section>

      <section className="mt-14" aria-labelledby="pulso-console-title">
        <Heading
          id="pulso-console-title"
            n="02 — Console"
            title="Fale com o servidor MCP"
            sub="Para quem quer ver por dentro: escolha um método ou uma ferramenta, ajuste os argumentos e veja a resposta JSON-RPC exata, com status HTTP e tempo."
        />
        <AgentConsole />
      </section>

      <section className="mt-14" aria-labelledby="pulso-connect-title">
        <h3 id="pulso-connect-title" className="sr-only">
          Conectar um assistente
        </h3>
        <ConnectPanel />
      </section>
    </div>
  );
}
