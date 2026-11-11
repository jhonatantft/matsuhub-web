/**
 * MCP tools of the Pulso demo store. Inputs are zod schemas; the JSON Schema advertised in
 * tools/list is generated from the same schemas, so validation and contract never drift.
 * Catalogue tools are Pulso's own; checkout tools follow the UCP checkout MCP binding.
 */
import { z } from "zod";
import { PULSO_PRODUCTS } from "@/content/pulso";
import { CATEGORIES, USES, findProduct, inventory, normalizeCep, productDetail, productSummary, searchProducts, shippingQuote } from "./catalog";
import { CheckoutIn, PaymentIn, cancelCheckout, completeCheckout, createCheckout, getCheckout, updateCheckout } from "./checkout";

export type ToolResult = { structured: unknown; isError?: boolean };

/** Thrown for UCP negotiation failures (JSON-RPC error -32001, per the UCP spec). */
export class UcpDiscoveryError extends Error {
  constructor(
    public code: "invalid_profile_url",
    message: string,
  ) {
    super(message);
  }
}

const productId = z.string().trim().min(1).max(40).describe('Id do produto (ex.: "one", "run") ou SKU (ex.: "PLS-RUN").');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const meta = (needsKey: boolean) =>
  z.looseObject({
    "ucp-agent": z.looseObject({
      profile: z.string().max(500).describe("URL do perfil UCP do agente (plataforma)."),
    }),
    "idempotency-key": needsKey
      ? z.string().regex(UUID, "UUID esperado").describe("UUID para repetir a chamada com segurança.")
      : z.string().regex(UUID, "UUID esperado").optional(),
  });

const checkoutId = z.string().min(5).max(3000).describe("Id do checkout devolvido por create_checkout/update_checkout (token assinado).");

type Def<S extends z.ZodType> = {
  name: string;
  title: string;
  description: string;
  input: S;
  readOnly: boolean;
  ucp?: boolean;
  run: (args: z.infer<S>, origin: string) => ToolResult;
};

const def = <S extends z.ZodType>(d: Def<S>) => d as unknown as Def<z.ZodType>;

export const TOOLS: Def<z.ZodType>[] = [
  def({
    name: "search_products",
    title: "Buscar produtos",
    description:
      'Busca no catálogo da Pulso (loja fictícia de áudio) por texto livre em português, com filtros opcionais. Ex.: "fone para correr até R$ 800". Preços em reais (BRL).',
    readOnly: true,
    input: z.strictObject({
      query: z.string().max(200).optional().describe("Texto livre. Entende usos (correr, viagem, trabalho, jogos), cancelamento de ruído e \"até R$ N\"."),
      category: z.enum(CATEGORIES).optional(),
      use: z.enum(USES).optional(),
      max_price: z.number().positive().max(100000).optional().describe("Preço máximo em reais."),
      min_battery_h: z.number().min(0).max(200).optional().describe("Bateria mínima em horas."),
      anc: z.boolean().optional().describe("Cancelamento ativo de ruído."),
      works_with: z.string().max(40).optional().describe("Só acessórios compatíveis com este produto (id)."),
      limit: z.number().int().min(1).max(8).optional().describe("Máximo de resultados (padrão 8)."),
    }),
    run: (a, origin) => {
      const { query, limit, ...filters } = a;
      const r = searchProducts(query, filters, limit ?? 8);
      return {
        structured: {
          query: query ?? null,
          applied_filters: r.filters,
          count: r.results.length,
          products: r.results.map(({ p }) => productSummary(p, origin)),
        },
      };
    },
  }),
  def({
    name: "get_product",
    title: "Detalhes do produto",
    description: "Ficha completa de um produto: descrição, especificações, preço, estoque e prazo de despacho.",
    readOnly: true,
    input: z.strictObject({ product_id: productId }),
    run: (a, origin) => {
      const p = findProduct(a.product_id);
      if (!p) return notFound(a.product_id);
      return { structured: productDetail(p, origin) };
    },
  }),
  def({
    name: "check_inventory",
    title: "Consultar estoque",
    description: "Diz se há estoque para a quantidade pedida e em quantos dias úteis o produto é despachado.",
    readOnly: true,
    input: z.strictObject({ product_id: productId, quantity: z.number().int().min(1).max(99).optional().describe("Padrão 1.") }),
    run: (a) => {
      const p = findProduct(a.product_id);
      if (!p) return notFound(a.product_id);
      return { structured: inventory(p, a.quantity ?? 1) };
    },
  }),
  def({
    name: "get_shipping_quote",
    title: "Calcular frete",
    description: "Calcula subtotal, frete e total de uma lista de itens (regra fixa de demonstração; grátis acima de R$ 499).",
    readOnly: true,
    input: z.strictObject({
      items: z.array(z.strictObject({ product_id: productId, quantity: z.number().int().min(1).max(10) })).min(1).max(10),
      postal_code: z.string().max(12).optional().describe("CEP de destino, ex.: 88010-000."),
    }),
    run: (a) => {
      const lines = [];
      for (const it of a.items) {
        const p = findProduct(it.product_id);
        if (!p) return notFound(it.product_id);
        lines.push({ product: p, quantity: it.quantity });
      }
      const cep = a.postal_code === undefined ? null : normalizeCep(a.postal_code);
      if (a.postal_code !== undefined && !cep) return { structured: { error: "CEP inválido: use 8 dígitos, ex.: 88010-000." }, isError: true };
      return { structured: shippingQuote(lines, cep) };
    },
  }),
  def({
    name: "create_checkout",
    title: "Criar checkout (UCP)",
    description:
      "UCP dev.ucp.shopping.checkout: cria uma sessão de checkout com os itens. O id devolvido é um token assinado que guarda o carrinho (servidor sem estado); envie-o de volta nas próximas chamadas. Informe o endereço em fulfillment.methods[0].destinations[0] para calcular o frete.",
    readOnly: false,
    ucp: true,
    input: z.looseObject({ meta: meta(false), checkout: CheckoutIn }),
    run: (a, origin) => ({ structured: createCheckout(a.checkout, origin) }),
  }),
  def({
    name: "get_checkout",
    title: "Ver checkout (UCP)",
    description: "UCP: devolve o estado atual de um checkout.",
    readOnly: true,
    ucp: true,
    input: z.looseObject({ meta: meta(false), id: checkoutId }),
    run: (a, origin) => ({ structured: getCheckout(a.id, origin) }),
  }),
  def({
    name: "update_checkout",
    title: "Atualizar checkout (UCP)",
    description:
      "UCP: substitui itens, comprador e endereço de entrega do checkout (substituição completa, como na especificação). Devolve um NOVO id; use-o daqui em diante.",
    readOnly: false,
    ucp: true,
    input: z.looseObject({ meta: meta(false), id: checkoutId, checkout: CheckoutIn }),
    run: (a, origin) => ({ structured: updateCheckout(a.id, a.checkout, origin) }),
  }),
  def({
    name: "complete_checkout",
    title: "Concluir checkout (UCP, simulado)",
    description:
      "UCP: conclui o checkout e devolve um pedido SIMULADO (\"simulated\": true). Loja de demonstração: nenhum pagamento é processado; não envie dados de pagamento (payment.instruments é recusado).",
    readOnly: false,
    ucp: true,
    input: z.looseObject({ meta: meta(true), id: checkoutId, checkout: z.looseObject({ payment: PaymentIn.optional() }) }),
    run: (a, origin) => ({ structured: completeCheckout(a.id, a.meta["idempotency-key"] as string, a.checkout, origin) }),
  }),
  def({
    name: "cancel_checkout",
    title: "Cancelar checkout (UCP)",
    description: "UCP: cancela um checkout em aberto.",
    readOnly: false,
    ucp: true,
    input: z.looseObject({ meta: meta(true), id: checkoutId }),
    run: (a, origin) => ({ structured: cancelCheckout(a.id, origin) }),
  }),
];

function notFound(id: string): ToolResult {
  return {
    structured: { error: `Produto "${id}" não encontrado.`, valid_ids: PULSO_PRODUCTS.map((p) => p.id) },
    isError: true,
  };
}

const jsonSchema = (s: z.ZodType) => {
  const out = z.toJSONSchema(s, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete out.$schema; // 2020-12 is MCP's default dialect
  return out;
};

let cachedList: unknown[] | null = null;
export function toolList() {
  cachedList ??= TOOLS.map((t) => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: jsonSchema(t.input),
    annotations: {
      title: t.title,
      readOnlyHint: t.readOnly,
      destructiveHint: false,
      idempotentHint: t.readOnly || t.name === "complete_checkout" || t.name === "cancel_checkout",
      openWorldHint: false,
    },
  }));
  return cachedList;
}

const isAllowedProfile = (raw: string) => {
  try {
    const u = new URL(raw);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
};

const issues = (e: z.ZodError) =>
  e.issues.map((i) => ({ path: i.path.length ? i.path.join(".") : "(raiz)", message: i.message }));

/** Runs a tool. Returns null when the tool does not exist (caller answers with a protocol error). */
export function callTool(name: string, args: unknown, origin: string): ToolResult | null {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return null;
  if (tool.ucp) {
    const profile = (args as { meta?: { "ucp-agent"?: { profile?: unknown } } } | undefined)?.meta?.["ucp-agent"]?.profile;
    if (typeof profile !== "string" || !isAllowedProfile(profile)) {
      throw new UcpDiscoveryError(
        "invalid_profile_url",
        'meta["ucp-agent"].profile ausente ou inválido: envie a URL https do perfil UCP do seu agente.',
      );
    }
  }
  const parsed = tool.input.safeParse(args ?? {});
  if (!parsed.success) {
    return { structured: { error: "Argumentos inválidos.", issues: issues(parsed.error) }, isError: true };
  }
  return tool.run(parsed.data, origin);
}
