"use client";

import { useRef, useState } from "react";
import { brl } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { ExchangeView, useOrigin } from "./ExchangeView";
import { AGENT_PROFILE_PATH, type Exchange, callTool, getUcpProfile, mcp, structured, uuid } from "./mcpClient";

type StepState = "pending" | "running" | "done" | "failed";
type Step = { title: string; state: StepState; note?: string; x?: Exchange };

const TITLES = [
  "Descobrir a loja (perfil UCP)",
  "Conhecer o servidor MCP",
  "Listar as ferramentas",
  "Buscar o que você pediu",
  "Ler a ficha do produto",
  "Conferir o estoque",
  "Criar o checkout (UCP)",
  "Informar o endereço e calcular o frete",
  "Concluir a compra (simulada)",
];

const DEMO_ADDRESS = {
  street_address: "Rua Felipe Schmidt, 100",
  address_locality: "Florianópolis",
  address_region: "SC",
  postal_code: "88010-000",
  address_country: "BR",
};

type Product = { id: string; name: string; price: { display: string }; stock?: number };
type Checkout = {
  id: string;
  status: string;
  totals: { type: string; amount: number; display_text?: string }[];
  line_items: { item: { id: string; title: string }; quantity: number }[];
  order?: { id: string; label?: string; permalink_url: string };
  messages?: { type: string; content: string }[];
};

const reais = (cents: number) => brl(cents / 100);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AgentRun() {
  const origin = useOrigin();
  const [sentence, setSentence] = useState("Quero um fone para correr, até R$ 800");
  const [steps, setSteps] = useState<Step[]>(() => TITLES.map((title) => ({ title, state: "pending" })));
  const [running, setRunning] = useState(false);
  const [order, setOrder] = useState<Checkout | null>(null);
  const [live, setLive] = useState("");
  const runRef = useRef(0);

  async function run() {
    const runId = ++runRef.current;
    setRunning(true);
    setOrder(null);
    setSteps(TITLES.map((title) => ({ title, state: "pending" })));
    const alive = () => runRef.current === runId;

    const set = (i: number, patch: Partial<Step>) => {
      if (!alive()) return;
      setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
      if (patch.state === "running") setLive(`Passo ${i + 1} de ${TITLES.length}: ${TITLES[i]}…`);
      if (patch.note && patch.state !== "running") setLive(`Passo ${i + 1}: ${patch.note}`);
    };

    /** Runs one step; returns the exchange or null (and stops) on failure. */
    const step = async (i: number, call: () => Promise<Exchange>, explain: (x: Exchange) => string | Error | null) => {
      set(i, { state: "running" });
      const x = await call();
      if (!alive()) return null;
      if (x.failed) {
        set(i, { state: "failed", x, note: `Falhou: ${x.error ?? "erro"}. A execução parou aqui.` });
        return null;
      }
      const note = explain(x);
      if (note === null || note instanceof Error) {
        set(i, { state: "failed", x, note: `${note?.message ?? "A resposta não trouxe o que o agente precisava."} A execução parou aqui.` });
        return null;
      }
      set(i, { state: "done", x, note });
      await pause(250);
      return x;
    };

    const meta = { "ucp-agent": { profile: origin + AGENT_PROFILE_PATH } };
    try {
      const a = await step(0, getUcpProfile, (x) => {
        const p = x.response as { ucp?: { version?: string; services?: Record<string, { transport: string; endpoint?: string }[]> } };
        const mcpSvc = p.ucp?.services?.["dev.ucp.shopping"]?.find((s) => s.transport === "mcp");
        return mcpSvc ? `A loja publica UCP ${p.ucp?.version} e diz onde comprar: checkout via MCP em ${mcpSvc.endpoint}.` : null;
      });
      if (!a) return;

      const b = await step(1, () => mcp("server/discover"), (x) => {
        const r = (x.response as { result?: { supportedVersions?: string[] } }).result;
        return r?.supportedVersions ? `Servidor responde: fala MCP ${r.supportedVersions[0]} (e versões antigas). Não precisa de handshake.` : null;
      });
      if (!b) return;

      const c = await step(2, () => mcp("tools/list"), (x) => {
        const tools = (x.response as { result?: { tools?: { name: string }[] } }).result?.tools;
        return tools ? `${tools.length} ferramentas: ${tools.map((t) => t.name).join(", ")}.` : null;
      });
      if (!c) return;

      let product: Product | undefined;
      const d = await step(3, () => callTool("search_products", { query: sentence.trim() || "fone", limit: 3 }), (x) => {
        const r = structured<{ products: Product[] }>(x);
        product = r?.products[0];
        if (r && !product) return new Error("Nenhum produto combina com a frase: tente outra, como \"caixa de som para viagem\".");
        if (!product) return null;
        return `Achou ${r!.products.length} opção(ões). A melhor para o pedido: ${product.name}, ${product.price.display}.`;
      });
      if (!d || !product) return;
      const pid = product.id;

      const e = await step(4, () => callTool("get_product", { product_id: pid }), (x) => {
        const p = structured<{ short: string; ships_in_business_days: number }>(x);
        return p ? `${product!.name}: ${p.short.toLowerCase()}. Despacho em até ${p.ships_in_business_days} dias úteis.` : null;
      });
      if (!e) return;

      const f = await step(5, () => callTool("check_inventory", { product_id: pid, quantity: 1 }), (x) => {
        const s = structured<{ available: boolean; stock: number }>(x);
        if (!s) return null;
        return s.available ? `Disponível: ${s.stock} unidades em estoque.` : null;
      });
      if (!f) return;

      let checkout: Checkout | null = null;
      const g = await step(6, () => callTool("create_checkout", { meta, checkout: { line_items: [{ item: { id: pid }, quantity: 1 }] } }), (x) => {
        checkout = structured<Checkout>(x);
        if (!checkout?.id) return null;
        for (const li of checkout.line_items) {
          window.dispatchEvent(new CustomEvent("pulso:cart-add", { detail: { productId: li.item.id, qty: li.quantity } }));
        }
        return `Checkout aberto (status ${checkout.status}) e item colocado no carrinho desta página. Falta o endereço.`;
      });
      if (!g || !checkout) return;
      const created: Checkout = checkout;

      const h = await step(
        7,
        () =>
          callTool("update_checkout", {
            meta,
            id: created.id,
            checkout: {
              line_items: created.line_items.map((li) => ({ item: { id: li.item.id }, quantity: li.quantity })),
              fulfillment: { methods: [{ type: "shipping", destinations: [DEMO_ADDRESS] }] },
            },
          }),
        (x) => {
          checkout = structured<Checkout>(x);
          if (!checkout?.id || checkout.status !== "ready_for_complete") return null;
          const ship = checkout.totals.find((t) => t.type === "fulfillment");
          const total = checkout.totals.find((t) => t.type === "total");
          return `Entrega em ${DEMO_ADDRESS.postal_code} (${DEMO_ADDRESS.address_locality}): frete ${!ship ? "—" : ship.amount === 0 ? "grátis" : reais(ship.amount)}, total ${total ? reais(total.amount) : "—"}. Pronto para concluir.`;
        },
      );
      if (!h || !checkout) return;
      const ready: Checkout = checkout;

      await step(8, () => callTool("complete_checkout", { meta: { ...meta, "idempotency-key": uuid() }, id: ready.id, checkout: {} }), (x) => {
        const done = structured<Checkout>(x);
        if (!done?.order) return null;
        if (alive()) setOrder(done);
        return `Pedido simulado ${done.order.id} criado. Nenhum pagamento foi processado.`;
      });
    } finally {
      if (alive()) setRunning(false);
    }
  }

  const exchanges = steps.filter((s) => s.x);
  const total = order?.totals.find((t) => t.type === "total");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="min-w-0 rounded-2xl border border-pu-line bg-pu-bg-2 p-5 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!running) void run();
          }}
        >
          <label htmlFor="pulso-agent-sentence" className="font-mono text-[11px] uppercase tracking-[0.14em] text-pu-mute">
            O que o cliente pediu ao assistente
          </label>
          <div className="mt-2 flex flex-col gap-2">
            <input
              id="pulso-agent-sentence"
              value={sentence}
              maxLength={200}
              onChange={(e) => setSentence(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-pu-line bg-pu-bg px-3.5 py-2.5 text-[15px] text-pu-ink outline-none focus-visible:border-pu-acc focus-visible:ring-2 focus-visible:ring-pu-acc/30"
            />
            <button
              type="submit"
              disabled={running || !origin}
              data-agent-run
              className="self-start rounded-xl bg-pu-acc px-5 py-2.5 font-pulso text-[14px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pu-acc disabled:opacity-50"
            >
              {running ? "Executando…" : "Ver um agente comprando"}
            </button>
          </div>
        </form>

        <ol className="mt-6 space-y-1" aria-label="Passos do agente">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl px-2 py-2" data-step-state={s.state}>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px]",
                  s.state === "done" && "bg-pu-acc text-white",
                  s.state === "running" && "bg-pu-acc-2/20 text-pu-ink ring-2 ring-pu-acc-2 motion-safe:animate-pulse",
                  s.state === "failed" && "bg-red-600 text-white",
                  s.state === "pending" && "bg-pu-bg text-pu-mute",
                )}
              >
                {s.state === "done" ? "✓" : s.state === "failed" ? "!" : i + 1}
              </span>
              <div className="min-w-0">
                <p className={cn("text-[14.5px] font-medium", s.state === "pending" ? "text-pu-mute" : "text-pu-ink")}>
                  {s.title}
                  <span className="sr-only">
                    {" "}
                    — {s.state === "done" ? "concluído" : s.state === "running" ? "em andamento" : s.state === "failed" ? "falhou" : "pendente"}
                  </span>
                </p>
                {s.note && <p className={cn("mt-0.5 text-[13.5px] leading-snug", s.state === "failed" ? "text-red-700" : "text-pu-mute")}>{s.note}</p>}
              </div>
            </li>
          ))}
        </ol>

        <p className="sr-only" aria-live="polite" role="status">
          {live}
        </p>

        {order?.order && (
          <div className="mt-5 rounded-xl border border-pu-acc/30 bg-pu-acc/[0.06] p-4" data-agent-order>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-pu-acc">Pedido simulado</p>
            <p className="mt-1 font-pulso text-[20px] font-semibold text-pu-ink">{order.order.id}</p>
            <p className="mt-1 text-[14px] text-pu-ink">
              {order.line_items.map((li) => `${li.quantity}× ${li.item.title}`).join(", ")} · total {total ? reais(total.amount) : "—"}
            </p>
            <p className="mt-2 text-[13px] text-pu-mute">Loja de demonstração: nenhum pagamento foi processado e nada será enviado.</p>
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0c0d12] p-3 shadow-[0_30px_80px_-40px_rgba(91,75,255,0.6)] sm:p-4">
        <p className="px-1 pb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">Mensagens reais desta execução</p>
        {exchanges.length === 0 ? (
          <p className="px-1 pb-2 text-[13.5px] text-white/55">As requisições e respostas aparecem aqui, na ordem em que acontecem.</p>
        ) : (
          <div className="space-y-2">
            {exchanges.map((s, i) => (
              <ExchangeView key={s.x!.key} x={s.x!} open={i === exchanges.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
