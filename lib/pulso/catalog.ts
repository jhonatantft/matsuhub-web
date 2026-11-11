/**
 * Catalogue logic behind the Pulso MCP tools: search, product view, stock, shipping quote.
 * Pure functions over content/pulso.ts — no I/O, safe on the server and deterministic.
 */
import { PULSO, PULSO_PRODUCTS, brl, pulsoShipping, type PulsoProduct, type PulsoUse } from "@/content/pulso";

export const CATEGORIES = ["fones", "caixas", "acessorios"] as const;
export const USES = ["corrida", "academia", "trabalho", "viagem", "casa", "games"] as const satisfies readonly PulsoUse[];

export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Product by id or SKU, case-insensitive. */
export function findProduct(idOrSku: string): PulsoProduct | undefined {
  const key = fold(idOrSku.trim());
  return PULSO_PRODUCTS.find((p) => p.id === key || fold(p.sku) === key);
}

export const money = (reais: number) => ({ amount: reais, currency: PULSO.currency, display: brl(reais) });

export function productSummary(p: PulsoProduct, origin: string) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: fold(p.category),
    short: p.short,
    price: money(p.price),
    in_stock: p.stock > 0,
    stock: p.stock,
    uses: p.uses,
    image_url: origin + p.image.small,
  };
}

export function productDetail(p: PulsoProduct, origin: string) {
  return {
    ...productSummary(p, origin),
    description: p.text,
    specs: {
      battery_h: p.specs.bateriaH ?? null,
      weight_g: p.specs.pesoG,
      anc: p.specs.anc,
      water_rating: p.specs.agua ?? null,
      bluetooth: p.specs.bluetooth ?? null,
      latency_ms: p.specs.latenciaMs ?? null,
      microphones: p.specs.microfones ?? null,
    },
    works_with: p.worksWith ?? [],
    ships_in_business_days: p.shipDays,
    image: { url: origin + p.image.src, alt: p.image.alt, width: p.image.width, height: p.image.height },
    page_url: `${origin}/demos/ecommerce`,
  };
}

/* ── Search ─────────────────────────────────────────────────────────────── */

const STOP = new Set(
  "a o as os um uma uns umas de do da dos das para pra por com sem e ou que eu me meu minha quero queria preciso procuro algo coisa bom boa melhor no na nos nas em ao ate mais muito pouco".split(" "),
);

/** Words a shopper uses → terms the catalogue knows. */
const SYNONYMS: Record<string, string[]> = {
  correr: ["corrida"],
  corro: ["corrida"],
  corridas: ["corrida"],
  running: ["corrida"],
  treino: ["academia", "corrida"],
  treinar: ["academia", "corrida"],
  malhar: ["academia"],
  gym: ["academia"],
  viajar: ["viagem"],
  viagens: ["viagem"],
  aviao: ["viagem", "anc"],
  voo: ["viagem", "anc"],
  escritorio: ["trabalho"],
  "home-office": ["trabalho"],
  reuniao: ["trabalho"],
  reunioes: ["trabalho"],
  chamadas: ["trabalho"],
  jogo: ["games"],
  jogos: ["games"],
  jogar: ["games"],
  console: ["games"],
  gamer: ["games"],
  tv: ["casa", "bar"],
  filme: ["casa", "bar"],
  filmes: ["casa", "bar"],
  festa: ["caixas"],
  caixa: ["caixas"],
  som: ["caixas"],
  fone: ["fones"],
  headphone: ["fones"],
  fones: ["fones"],
  ruido: ["anc"],
  silencio: ["anc"],
  cancelamento: ["anc"],
  barulho: ["anc"],
  agua: ["agua"],
  chuva: ["agua"],
  suor: ["agua"],
  acessorio: ["acessorios"],
  estojo: ["case"],
  base: ["dock"],
  carregador: ["dock"],
  transmissor: ["link"],
};

const haystack = (p: PulsoProduct) =>
  fold(
    [p.id, p.sku, p.name, p.category, p.short, p.text, p.uses.join(" "), p.specs.anc ? "anc cancelamento ruido" : "", p.specs.agua ? "agua" : ""].join(" "),
  );

export type SearchFilters = {
  category?: (typeof CATEGORIES)[number];
  use?: PulsoUse;
  max_price?: number;
  min_battery_h?: number;
  anc?: boolean;
  works_with?: string;
};

/** Reads "até R$ 800" / "ate 800 reais" out of free text. */
export function priceFromText(text: string): number | undefined {
  const m = fold(text).match(/(?:ate|abaixo de|menos de|no maximo)\s*(?:r\$\s*)?(\d{1,3}(?:[.\s]\d{3})*|\d+)(?:,\d{2})?\s*(?:reais)?/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/[.\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function searchProducts(query: string | undefined, filters: SearchFilters, limit: number) {
  const q = query?.trim() ?? "";
  const effective: SearchFilters = { ...filters };
  const inferredMax = q ? priceFromText(q) : undefined;
  if (effective.max_price === undefined && inferredMax !== undefined) effective.max_price = inferredMax;

  const words = fold(q.replace(/(?:até|ate)\s*(?:r\$\s*)?[\d.,\s]+(?:reais)?/gi, " "))
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w) && w !== "r");
  const terms = words.flatMap((w) => [w, ...(SYNONYMS[w] ?? [])]);

  const scored = PULSO_PRODUCTS.filter((p) => {
    if (effective.category && fold(p.category) !== effective.category) return false;
    if (effective.use && !p.uses.includes(effective.use)) return false;
    if (effective.max_price !== undefined && p.price > effective.max_price) return false;
    if (effective.min_battery_h !== undefined && (p.specs.bateriaH ?? 0) < effective.min_battery_h) return false;
    if (effective.anc !== undefined && p.specs.anc !== effective.anc) return false;
    if (effective.works_with && !(p.worksWith ?? []).includes(fold(effective.works_with))) return false;
    return true;
  })
    .map((p) => {
      const hay = haystack(p);
      let score = 0;
      for (const t of terms) {
        if (p.id === t) score += 5;
        if (p.uses.includes(t as PulsoUse)) score += 3;
        if (fold(p.category) === t) score += 2;
        if (hay.includes(t)) score += 1;
      }
      return { p, score };
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || a.p.price - b.p.price);

  return {
    terms,
    filters: effective,
    results: scored.slice(0, limit),
  };
}

/* ── Stock and shipping ─────────────────────────────────────────────────── */

export function inventory(p: PulsoProduct, quantity: number) {
  return {
    product_id: p.id,
    sku: p.sku,
    name: p.name,
    requested: quantity,
    stock: p.stock,
    available: p.stock >= quantity,
    ships_in_business_days: p.shipDays,
  };
}

/** BR postal code → "00000-000", or null. */
export function normalizeCep(raw: string | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : null;
}

export function shippingQuote(lines: { product: PulsoProduct; quantity: number }[], cep: string | null) {
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const shipping = pulsoShipping(subtotal);
  const shipDays = Math.max(0, ...lines.map((l) => l.product.shipDays));
  return {
    items: lines.map((l) => ({
      product_id: l.product.id,
      name: l.product.name,
      quantity: l.quantity,
      unit_price: money(l.product.price),
      line_total: money(l.product.price * l.quantity),
      in_stock: l.product.stock >= l.quantity,
    })),
    postal_code: cep,
    subtotal: money(subtotal),
    shipping: money(shipping),
    total: money(subtotal + shipping),
    free_shipping_from: money(PULSO.freeShippingFrom),
    ships_in_business_days: shipDays,
    rule: `Frete fixo de ${brl(PULSO.flatShipping)} para todo o Brasil; grátis a partir de ${brl(PULSO.freeShippingFrom)}. Regra de demonstração, não é cotação de transportadora.`,
  };
}
