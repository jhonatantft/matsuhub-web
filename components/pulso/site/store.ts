import { PULSO, PULSO_ONE_COLORS, PULSO_PRODUCTS, pulsoById, pulsoShipping, type PulsoProduct } from "@/content/pulso";
import { reducedMotion } from "@/lib/env";
import { lenisRef } from "@/lib/scroll";

/**
 * Client-side wiring of the Pulso demo page. Everything lives in memory for this visit only.
 *
 * Window events (contract with the 3D stage and the agent layer):
 *   in   pulso:cart-add  { productId, qty?, colorId? }     pulso:cart-clear
 *   out  pulso:cart      { items, subtotal, shipping, total }   (on every change)
 *        pulso:order     { orderId, total }                     (when an order is confirmed)
 *        pulso:explode   { value }  pulso:part { id }            (to the 3D stage)
 *   in   pulso:stage     { explode, part, working }              (from the 3D stage)
 */

/* ---------------------------------------------------------------- tiny external store */

function createStore<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    server: () => initial,
    set(next: T) {
      if (next === value) return;
      value = next;
      for (const fn of subs) fn();
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

/* ---------------------------------------------------------------- cart */

export type CartItem = { productId: string; qty: number; colorId?: string };
export type CartLine = CartItem & { product: PulsoProduct; key: string; color?: (typeof PULSO_ONE_COLORS)[number] };

const NO_ITEMS: readonly CartItem[] = [];
export const cartStore = createStore<readonly CartItem[]>(NO_ITEMS);

const colorOf = (id: string | undefined) => PULSO_ONE_COLORS.find((c) => c.id === id);
const lineKey = (i: CartItem) => `${i.productId}:${i.colorId ?? ""}`;

export function cartSummary(items: readonly CartItem[]) {
  const lines: CartLine[] = [];
  for (const item of items) {
    const product = pulsoById(item.productId);
    if (product) lines.push({ ...item, product, key: lineKey(item), color: colorOf(item.colorId) });
  }
  const subtotal = lines.reduce((n, l) => n + l.qty * l.product.price, 0);
  const shipping = pulsoShipping(subtotal);
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
    /** Reais still missing for free shipping (0 when already free or empty). */
    toFree: subtotal > 0 ? Math.max(0, PULSO.freeShippingFrom - subtotal) : PULSO.freeShippingFrom,
    shipDays: lines.reduce((n, l) => Math.max(n, l.product.shipDays), 0),
  };
}

function commit(next: readonly CartItem[]) {
  cartStore.set(next);
  const s = cartSummary(next);
  window.dispatchEvent(
    new CustomEvent("pulso:cart", {
      detail: {
        items: s.lines.map(({ productId, qty, colorId }) => (colorId ? { productId, qty, colorId } : { productId, qty })),
        subtotal: s.subtotal,
        shipping: s.shipping,
        total: s.total,
      },
    }),
  );
}

/** Adds (or removes, with a negative qty) units; quantities are capped by the real stock. Returns the qty added. */
export function addToCart(productId: string, qty = 1, colorId?: string): number {
  const product = pulsoById(productId);
  if (!product || !Number.isFinite(qty) || qty === 0) return 0;
  const color = product.id === "one" ? (colorOf(colorId) ?? PULSO_ONE_COLORS[0]).id : undefined;
  const items = cartStore.get();
  const key = lineKey({ productId, qty: 0, colorId: color });
  const inCart = items.filter((i) => i.productId === productId).reduce((n, i) => n + i.qty, 0);
  const current = items.find((i) => lineKey(i) === key);
  const room = product.stock - inCart;
  const delta = qty > 0 ? Math.min(Math.round(qty), room) : Math.max(Math.round(qty), -(current?.qty ?? 0));
  if (delta === 0) return 0;
  const next = current
    ? items.map((i) => (i === current ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0)
    : [...items, { productId, qty: delta, ...(color ? { colorId: color } : {}) }];
  commit(next);
  if (delta > 0) noteInterest(productId, "add");
  return delta;
}

export function removeLine(key: string) {
  commit(cartStore.get().filter((i) => lineKey(i) !== key));
}

export function clearCart() {
  if (cartStore.get().length) commit(NO_ITEMS);
}

export const productsInCart = (items: readonly CartItem[]) => new Set(items.map((i) => i.productId));

/** Demo order number derived from the cart and the CEP (FNV-1a), never random. */
export function orderIdFor(items: readonly CartItem[], cep: string) {
  const text = items.map((i) => `${i.productId}.${i.qty}.${i.colorId ?? ""}`).join("|") + `#${cep}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `PLS-${h.toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

/* ---------------------------------------------------------------- UI state shared between sections */

export const uiStore = createStore<{ cart: boolean; colorId: string }>({ cart: false, colorId: PULSO_ONE_COLORS[0].id });
export const setCartOpen = (cart: boolean) => uiStore.set({ ...uiStore.get(), cart });
export const setOneColor = (colorId: string) => {
  if (colorOf(colorId)) uiStore.set({ ...uiStore.get(), colorId });
};

/** Ids ticked for comparison (max 3), in the order they were ticked. */
export const compareStore = createStore<readonly string[]>([]);
export const COMPARE_MAX = 3;
export function toggleCompare(id: string) {
  const list = compareStore.get();
  if (list.includes(id)) compareStore.set(list.filter((x) => x !== id));
  else if (list.length < COMPARE_MAX) compareStore.set([...list, id]);
}
export const clearCompare = () => compareStore.set([]);

/** The intent-search box text; Eco and the header can set it. */
export const searchStore = createStore<{ text: string; focus: number }>({ text: "", focus: 0 });
export const setSearch = (text: string) => searchStore.set({ ...searchStore.get(), text });
export const focusSearch = (text?: string) => {
  const s = searchStore.get();
  searchStore.set({ text: text ?? s.text, focus: s.focus + 1 });
};

/* ---------------------------------------------------------------- what this visit has shown interest in */

export type InterestKind = "view" | "search" | "add" | "compare";
const WEIGHT: Record<InterestKind, number> = { view: 1, search: 1.5, add: 3, compare: 1.5 };

/** Per product: accumulated weight and the strongest reason so far. */
export type Interest = Readonly<Record<string, { w: number; kind: InterestKind }>>;
export const interestStore = createStore<Interest>({});

export function noteInterest(productId: string, kind: InterestKind, scale = 1) {
  if (!pulsoById(productId)) return;
  const all = interestStore.get();
  const prev = all[productId];
  const add = WEIGHT[kind] * scale;
  const strongest = !prev || WEIGHT[kind] >= WEIGHT[prev.kind] ? kind : prev.kind;
  interestStore.set({ ...all, [productId]: { w: (prev?.w ?? 0) + add, kind: strongest } });
}

/** Re-orders the catalogue by this visit's signals: own weight + shared uses/category + accessories made for it. */
export function forYou(interest: Interest, inCart: Set<string>) {
  const seen = Object.keys(interest);
  if (!seen.length) return null;
  const scored = PULSO_PRODUCTS.map((p) => {
    let score = 0;
    let because: { id: string; w: number; why: string } | null = null;
    for (const id of seen) {
      const src = pulsoById(id)!;
      const w = interest[id].w;
      let link = 0;
      let why = "";
      if (id === p.id) {
        link = 1.6;
        why = interest[id].kind === "add" ? "no seu carrinho" : interest[id].kind === "search" ? "apareceu na sua busca" : "você olhou";
      } else if (p.worksWith?.includes(id)) {
        link = 0.9;
        why = `feito para o ${src.name.replace("Pulso ", "")}`;
      } else {
        const shared = p.uses.filter((u) => src.uses.includes(u));
        if (shared.length) {
          link = 0.15 * shared.length + (p.category === src.category ? 0.15 : 0);
          why = `também para ${shared[0]}, como o ${src.name.replace("Pulso ", "")}`;
        }
      }
      score += w * link;
      if (link && (!because || w * link > because.w)) because = { id, w: w * link, why };
    }
    // what is already in the cart is not suggested again: suggest the next thing
    if (inCart.has(p.id)) score = 0;
    return { product: p, score, why: because?.why ?? "" };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

/* ---------------------------------------------------------------- page sections */

export const SECTION = { one: "one", search: "busca", products: "produtos", compare: "comparar", agents: "agentes" } as const;

export const SITE_NAV = [
  { label: "Produtos", id: SECTION.products },
  { label: "Tecnologia", id: SECTION.one },
  { label: "Para agentes", id: SECTION.agents },
] as const;

export function scrollToSection(id: string, after?: () => void) {
  const el = id === "top" ? null : document.getElementById(id);
  const lenis = lenisRef.current;
  const instant = reducedMotion();
  if (lenis) lenis.scrollTo(el ?? 0, { duration: instant ? 0 : 1.2, immediate: instant, onComplete: after });
  else {
    if (el) el.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: instant ? "auto" : "smooth" });
    if (after) window.setTimeout(after, instant ? 0 : 700);
  }
}

/** Short product name without the brand ("Pulso One" → "One"). */
export const short = (p: PulsoProduct) => p.name.replace(/^Pulso\s+/, "");
