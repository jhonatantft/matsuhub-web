/**
 * Stateless UCP checkout for the Pulso demo (dev.ucp.shopping.checkout + fulfillment, over MCP).
 *
 * There is no database: the checkout id IS the checkout state — a signed token
 * `chk_<base64url(JSON)>.<hmac>` validated on every call. Each mutation returns a new id
 * (the old one stays a valid, immutable snapshot). Completing returns a SIMULATED order:
 * no payment is ever processed and payment credentials are refused.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PULSO, brl, pulsoShipping, type PulsoProduct } from "@/content/pulso";
import { findProduct, normalizeCep } from "./catalog";
import { PULSO_PATHS } from "./site";
import { DEMO_NOTE, checkoutEnvelope, errorEnvelope } from "./ucp";

const TTL_S = 6 * 60 * 60; // spec default TTL: 6 hours
const MAX_LINES = 10;
const MAX_QTY = 10;
const MAX_TOKEN = 3000;

// A demo secret: tokens only carry cart contents (no personal or payment data of value),
// and every field is re-validated against the catalogue anyway.
const SECRET = process.env.PULSO_CHECKOUT_SECRET ?? "pulso-demo-checkout-v1";

/* ── Token ──────────────────────────────────────────────────────────────── */

const str = (max: number) => z.string().trim().max(max);

const Address = z.object({
  street_address: str(160).optional(),
  extended_address: str(160).optional(),
  address_locality: str(80).optional(),
  address_region: str(40).optional(),
  address_country: str(2).optional(),
  postal_code: str(12).optional(),
  first_name: str(80).optional(),
  last_name: str(80).optional(),
});
export type Address = z.infer<typeof Address>;

const Buyer = z.object({
  first_name: str(80).optional(),
  last_name: str(80).optional(),
  email: z.email().max(160).optional(),
  phone_number: str(20).optional(),
});
export type Buyer = z.infer<typeof Buyer>;

const State = z.strictObject({
  v: z.literal(1),
  li: z.array(z.tuple([z.string().max(40), z.number().int().min(1).max(MAX_QTY)])).min(1).max(MAX_LINES),
  b: Buyer.optional(),
  d: Address.optional(),
  s: z.enum(["open", "completed", "canceled"]),
  t: z.number().int().positive(),
  /** Idempotency key that completed this checkout. */
  k: z.string().max(64).optional(),
});
type State = z.infer<typeof State>;

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const sign = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("base64url").slice(0, 22);

export function encodeId(state: State) {
  const payload = b64(JSON.stringify(state));
  return `chk_${payload}.${sign(payload)}`;
}

export type DecodeError = "malformed" | "signature" | "invalid";

export function decodeId(id: string): { ok: true; state: State } | { ok: false; reason: DecodeError } {
  if (typeof id !== "string" || id.length > MAX_TOKEN || !id.startsWith("chk_")) return { ok: false, reason: "malformed" };
  const [payload, sig, extra] = id.slice(4).split(".");
  if (!payload || !sig || extra !== undefined) return { ok: false, reason: "malformed" };
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature" };
  try {
    const parsed = State.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (!parsed.success) return { ok: false, reason: "invalid" };
    if (parsed.data.li.some(([pid]) => !findProduct(pid))) return { ok: false, reason: "invalid" };
    return { ok: true, state: parsed.data };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

/* ── Request payloads (UCP checkout, request shape) ─────────────────────── */

export const LineItemIn = z.looseObject({
  item: z.looseObject({ id: z.string().trim().min(1).max(40).describe("Id do produto (ex.: \"run\") ou SKU (ex.: \"PLS-RUN\").") }),
  quantity: z.number().int().min(1).max(MAX_QTY),
});

const DestinationIn = Address.extend({
  id: str(40).optional(),
  type: z.literal("shipping_address").optional(),
});

export const FulfillmentIn = z.looseObject({
  methods: z
    .array(
      z.looseObject({
        type: z.literal("shipping").describe("Só há entrega (shipping) nesta loja."),
        destinations: z.array(DestinationIn).max(1).optional(),
        groups: z.array(z.looseObject({ id: str(40).optional(), selected_option_id: z.string().max(40).nullable().optional() })).max(1).optional(),
      }),
    )
    .max(1),
});

export const PaymentIn = z.looseObject({ instruments: z.array(z.unknown()).max(5).optional() });

export const CheckoutIn = z.looseObject({
  line_items: z.array(LineItemIn).min(1).max(MAX_LINES),
  buyer: Buyer.optional(),
  fulfillment: FulfillmentIn.optional(),
  payment: PaymentIn.optional(),
});
export type CheckoutIn = z.infer<typeof CheckoutIn>;

/* ── Response building ──────────────────────────────────────────────────── */

type Msg =
  | { type: "error"; code: string; content: string; severity: "recoverable" | "requires_buyer_input" | "requires_buyer_review" | "unrecoverable"; path?: string }
  | { type: "warning"; code: string; content: string; path?: string }
  | { type: "info"; code?: string; content: string; path?: string };

const cents = (reais: number) => Math.round(reais * 100);
const lineId = (i: number) => `li_${i + 1}`;

const resolveLines = (state: State) =>
  state.li.map(([pid, qty]) => ({ product: findProduct(pid) as PulsoProduct, quantity: qty }));

const validDestination = (d: Address | undefined) => {
  if (!d) return { ok: false as const, why: "missing" as const };
  if (d.address_country && d.address_country.toUpperCase() !== "BR") return { ok: false as const, why: "country" as const };
  if (!normalizeCep(d.postal_code)) return { ok: false as const, why: "cep" as const };
  return { ok: true as const };
};

export function orderIdFor(state: State) {
  const lines = [...state.li].sort((a, b) => a[0].localeCompare(b[0]));
  const h = createHash("sha256")
    .update(JSON.stringify({ lines, cep: normalizeCep(state.d?.postal_code) }))
    .digest("hex");
  return `PLS-${h.slice(0, 8).toUpperCase()}`;
}

function build(state: State, origin: string, extra: Msg[] = []) {
  const id = encodeId(state);
  const lines = resolveLines(state);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const dest = validDestination(state.d);
  const shipping = dest.ok ? pulsoShipping(subtotal) : null;
  const shipDays = Math.max(...lines.map((l) => l.product.shipDays));
  const lineIds = lines.map((_, i) => lineId(i));

  const messages: Msg[] = [...extra];
  if (state.s === "open" && !dest.ok) {
    messages.push(
      dest.why === "country"
        ? { type: "error", code: "address_undeliverable", content: "A Pulso (demonstração) só entrega no Brasil.", severity: "recoverable", path: "$.fulfillment.methods[0].destinations[0].address_country" }
        : dest.why === "cep"
          ? { type: "error", code: "invalid_postal_code", content: "CEP inválido: use 8 dígitos, por exemplo 88010-000.", severity: "recoverable", path: "$.fulfillment.methods[0].destinations[0].postal_code" }
          : { type: "error", code: "fulfillment_address_required", content: "Informe um endereço de entrega com CEP (update_checkout) para calcular o frete.", severity: "recoverable", path: "$.fulfillment" },
    );
  }
  messages.push({ type: "info", code: "demo_store", content: DEMO_NOTE });

  const status =
    state.s === "completed" ? "completed" : state.s === "canceled" ? "canceled" : dest.ok ? "ready_for_complete" : "incomplete";

  const totals = [
    { type: "subtotal", display_text: "Subtotal", amount: cents(subtotal) },
    ...(shipping === null ? [] : [{ type: "fulfillment", display_text: shipping === 0 ? "Frete (grátis)" : "Frete", amount: cents(shipping) }]),
    { type: "total", display_text: "Total", amount: cents(subtotal + (shipping ?? 0)) },
  ];

  const destination = state.d && dest.ok ? { type: "shipping_address" as const, id: "dest_1", ...state.d, postal_code: normalizeCep(state.d.postal_code) as string, address_country: "BR" } : null;

  const checkout: Record<string, unknown> = {
    ucp: checkoutEnvelope(),
    id,
    status,
    currency: PULSO.currency,
    ...(state.b ? { buyer: state.b } : {}),
    line_items: lines.map((l, i) => ({
      id: lineIds[i],
      item: { id: l.product.id, title: l.product.name, price: cents(l.product.price), image_url: origin + l.product.image.small },
      quantity: l.quantity,
      totals: [
        { type: "subtotal", amount: cents(l.product.price * l.quantity) },
        { type: "total", amount: cents(l.product.price * l.quantity) },
      ],
    })),
    totals,
    fulfillment: {
      methods: [
        {
          id: "envio",
          type: "shipping",
          line_item_ids: lineIds,
          selected_destination_id: destination ? destination.id : null,
          destinations: destination ? [destination] : [],
          ...(destination && shipping !== null
            ? {
                groups: [
                  {
                    id: "pacote_1",
                    line_item_ids: lineIds,
                    selected_option_id: "padrao",
                    options: [
                      {
                        id: "padrao",
                        title: "Entrega padrão",
                        description: `Despacho em até ${shipDays} dias úteis. Frete grátis a partir de ${brl(PULSO.freeShippingFrom)}.`,
                        totals: [{ type: "total", amount: cents(shipping) }],
                      },
                    ],
                  },
                ],
              }
            : {}),
        },
      ],
    },
    links: [{ type: "faq", url: origin + PULSO_PATHS.llms, title: "Sobre esta loja de demonstração" }],
    messages,
    expires_at: new Date((state.t + TTL_S) * 1000).toISOString(),
  };
  if (state.s === "open") checkout.continue_url = origin + PULSO_PATHS.store;
  if (state.s === "completed") {
    const orderId = orderIdFor(state);
    checkout.order = {
      id: orderId,
      label: `Pedido simulado ${orderId}`,
      permalink_url: `${origin}${PULSO_PATHS.store}?pedido=${orderId}`,
    };
    checkout.simulated = true;
  }
  return checkout;
}

function errorResponse(origin: string, code: string, content: string, path?: string) {
  return {
    ucp: errorEnvelope(),
    messages: [{ type: "error", code, content, severity: "unrecoverable", ...(path ? { path } : {}) }],
    continue_url: origin + PULSO_PATHS.store,
  };
}

const nowS = () => Math.floor(Date.now() / 1000);

/** Merges duplicate products, clamps to stock. Returns null + error response if an item is unknown. */
function linesFrom(input: CheckoutIn["line_items"], origin: string) {
  const merged = new Map<string, number>();
  const warnings: Msg[] = [];
  for (const [i, li] of input.entries()) {
    const p = findProduct(li.item.id);
    if (!p) return { error: errorResponse(origin, "item_unavailable", `Produto "${li.item.id}" não existe no catálogo da Pulso.`, `$.line_items[${i}].item.id`) };
    merged.set(p.id, Math.min(MAX_QTY, (merged.get(p.id) ?? 0) + li.quantity));
  }
  const li: [string, number][] = [];
  for (const [pid, qty] of merged) {
    const p = findProduct(pid) as PulsoProduct;
    if (p.stock <= 0) return { error: errorResponse(origin, "out_of_stock", `${p.name} está sem estoque.`) };
    const q = Math.min(qty, p.stock);
    if (q < qty) {
      warnings.push({ type: "warning", code: "quantity_adjusted", content: `Quantidade de ${p.name} ajustada: pedido de ${qty}, só ${p.stock} em estoque.`, path: `$.line_items[${li.length}].quantity` });
    }
    li.push([pid, q]);
  }
  return { li, warnings };
}

const destinationFrom = (c: CheckoutIn): Address | undefined => {
  const d = c.fulfillment?.methods[0]?.destinations?.[0];
  if (!d) return undefined;
  // Keep only postal-address fields (drops id/type; ours are assigned).
  const { id: _id, type: _type, ...addr } = d;
  void _id;
  void _type;
  return addr;
};

const refusePayment = (c: { payment?: { instruments?: unknown[] } }): Msg | null =>
  c.payment?.instruments && c.payment.instruments.length > 0
    ? {
        type: "error",
        code: "payment_not_accepted",
        content: "Loja de demonstração: não envie dados de pagamento. Os instrumentos enviados foram descartados sem serem lidos nem guardados.",
        severity: "recoverable",
        path: "$.payment.instruments",
      }
    : null;

/* ── Operations ─────────────────────────────────────────────────────────── */

export function createCheckout(input: CheckoutIn, origin: string) {
  const lines = linesFrom(input.line_items, origin);
  if ("error" in lines) return lines.error;
  const pay = refusePayment(input);
  const state: State = { v: 1, li: lines.li, b: input.buyer, d: destinationFrom(input), s: "open", t: nowS() };
  return build(state, origin, [...lines.warnings, ...(pay ? [pay] : [])]);
}

function load(id: string, origin: string) {
  const r = decodeId(id);
  if (!r.ok) {
    const content =
      r.reason === "signature"
        ? "Checkout não encontrado: o id foi alterado ou não foi emitido por esta loja."
        : "Checkout não encontrado: id inválido.";
    return { error: errorResponse(origin, "not_found", content, "$.id") };
  }
  if (r.state.s === "open" && nowS() > r.state.t + TTL_S) {
    return { error: errorResponse(origin, "not_found", "Checkout expirado (validade de 6 horas). Crie um novo.", "$.id") };
  }
  return { state: r.state };
}

export function getCheckout(id: string, origin: string) {
  const l = load(id, origin);
  return "error" in l ? l.error : build(l.state, origin);
}

/** Full replacement of the writable fields (spec: Update Checkout). */
export function updateCheckout(id: string, input: CheckoutIn, origin: string) {
  const l = load(id, origin);
  if ("error" in l) return l.error;
  if (l.state.s !== "open") {
    return build(l.state, origin, [{ type: "error", code: "checkout_closed", content: "Este checkout já foi concluído ou cancelado e não pode ser alterado.", severity: "unrecoverable" }]);
  }
  const lines = linesFrom(input.line_items, origin);
  if ("error" in lines) return lines.error;
  const pay = refusePayment(input);
  const state: State = { ...l.state, li: lines.li, b: input.buyer, d: destinationFrom(input) };
  return build(state, origin, [...lines.warnings, ...(pay ? [pay] : [])]);
}

export function completeCheckout(id: string, idempotencyKey: string, input: { payment?: { instruments?: unknown[] } }, origin: string) {
  const l = load(id, origin);
  if ("error" in l) return l.error;
  const { state } = l;
  if (state.s === "completed") {
    return state.k === idempotencyKey
      ? build(state, origin) // same request retried: same result
      : build(state, origin, [{ type: "warning", code: "already_completed", content: "Este checkout já foi concluído; o pedido abaixo é o mesmo." }]);
  }
  if (state.s === "canceled") {
    return build(state, origin, [{ type: "error", code: "checkout_closed", content: "Checkout cancelado: crie um novo.", severity: "unrecoverable" }]);
  }
  const pay = refusePayment(input);
  if (pay) return build(state, origin, [pay]);
  if (!validDestination(state.d).ok) return build(state, origin);
  const done: State = { ...state, s: "completed", k: idempotencyKey };
  return build(done, origin, [
    { type: "info", code: "simulated_order", content: "Pedido simulado: nenhum pagamento foi processado e nada será enviado. Esta é uma loja de demonstração." },
  ]);
}

export function cancelCheckout(id: string, origin: string) {
  const l = load(id, origin);
  if ("error" in l) return l.error;
  if (l.state.s !== "open") {
    return build(l.state, origin, [{ type: "error", code: "not_cancelable", content: "Só é possível cancelar um checkout em aberto.", severity: "unrecoverable" }]);
  }
  return build({ ...l.state, s: "canceled" }, origin);
}
