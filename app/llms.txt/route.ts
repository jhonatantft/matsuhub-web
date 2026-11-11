import { PULSO, PULSO_PRODUCTS, brl } from "@/content/pulso";
import { PULSO_PATHS, siteOrigin } from "@/lib/pulso/site";
import { UCP_VERSION } from "@/lib/pulso/ucp";

/** Plain-text guide for language models (llmstxt.org format). */
export async function GET(request: Request) {
  const o = siteOrigin(request);
  const products = PULSO_PRODUCTS.map(
    (p) => `- ${p.name} (id \`${p.id}\`, ${p.sku}) — ${brl(p.price)} — ${p.short}. ${p.stock > 0 ? `Em estoque (${p.stock})` : "Sem estoque"}.`,
  ).join("\n");

  const body = `# ${PULSO.name} — loja de demonstração

> ${PULSO.name} é uma marca FICTÍCIA de áudio criada pela MatsuHub para demonstrar uma loja online pronta para agentes de IA. Produtos, preços e estoque são de exemplo; nenhum pagamento é processado e nenhum pedido é enviado.

Loja: ${o}${PULSO_PATHS.store}
Moeda: BRL. Frete: ${brl(PULSO.flatShipping)} fixo, grátis a partir de ${brl(PULSO.freeShippingFrom)} (regra de demonstração).

## Produtos

${products}

## Para agentes

- [Servidor MCP](${o}${PULSO_PATHS.mcp}): Streamable HTTP, sem autenticação, respostas JSON. Revisão 2026-07-28 (server/discover, metadados por requisição) e legadas via initialize (2025-11-25, 2025-06-18, 2025-03-26). Ferramentas: search_products, get_product, check_inventory, get_shipping_quote e o checkout UCP (create_checkout, get_checkout, update_checkout, complete_checkout, cancel_checkout).
- [Perfil UCP](${o}${PULSO_PATHS.ucp}): Universal Commerce Protocol ${UCP_VERSION}, capacidade dev.ucp.shopping.checkout via MCP. Implementação de demonstração, não certificada.
- O checkout não guarda estado no servidor: o id do checkout é um token assinado que o agente devolve a cada chamada. Concluir devolve um pedido simulado ("simulated": true). Nunca envie dados de pagamento.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
