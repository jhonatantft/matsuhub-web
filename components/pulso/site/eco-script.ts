import { brl, ECO, PULSO, PULSO_ONE_COLORS, PULSO_PRODUCTS, pulsoById, pulsoShipping, type PulsoProduct, type PulsoUse } from "@/content/pulso";
import { verdicts } from "./compare";
import { chipsOf, norm, parseIntent, rankProducts, USE_LABEL } from "./intent";
import { cartSummary, short, type CartItem } from "./store";

/**
 * Eco, the scripted AI salesperson. Not a language model: keyword rules pick the topic, and
 * every number in the answer is computed from content/pulso.ts and the live cart.
 */

export type EcoAction =
  | { kind: "add"; items: CartItem[] }
  | { kind: "search"; text: string; go?: boolean }
  | { kind: "compare"; ids: string[] }
  | { kind: "cart" };

export type EcoStep = { say: string[]; replies: string[]; action?: EcoAction };

export type EcoMemory = { last?: string; kit?: CartItem[]; query?: string; pair?: [string, string] };
export const newMemory = (): EcoMemory => ({});

export const ECO_START: EcoStep = { say: [ECO.greeting], replies: [...ECO.chips] };

const NAMES: [string, RegExp][] = PULSO_PRODUCTS.map((p) => [p.id, new RegExp(`\\b${p.id}\\b`)]);

/** Product ids mentioned in the text, in the order they appear. */
function mentioned(t: string) {
  return NAMES.map(([id, re]) => ({ id, at: t.search(re) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((m) => m.id);
}

const colorIn = (t: string) => PULSO_ONE_COLORS.find((c) => t.includes(norm(c.name)));
const qtyIn = (t: string) => {
  const m = t.match(/\b(\d{1,2})\s*(?:x|unidades?|un)\b/) ?? t.match(/\b(dois|duas|tres)\b/);
  if (!m) return 1;
  return ({ dois: 2, duas: 2, tres: 3 } as Record<string, number>)[m[1]] ?? Number(m[1]);
};

const totalLine = (subtotal: number) => {
  const ship = pulsoShipping(subtotal);
  return ship === 0
    ? `${brl(subtotal)}, com frete grátis (acima de ${brl(PULSO.freeShippingFrom)}).`
    : `${brl(subtotal)} + ${brl(ship)} de frete. Faltam ${brl(PULSO.freeShippingFrom - subtotal)} para o frete grátis.`;
};

function specLine(p: PulsoProduct) {
  const s = p.specs;
  return [
    s.bateriaH && `${s.bateriaH} h de bateria`,
    `${s.pesoG} g`,
    s.anc && "cancelamento de ruído",
    s.agua,
    s.latenciaMs && s.latenciaMs <= 30 && `${s.latenciaMs} ms de latência`,
  ]
    .filter(Boolean)
    .join(", ");
}

function recommend(text: string, mem: EcoMemory): EcoStep | null {
  const intent = parseIntent(text);
  if (!chipsOf(intent).length) return null;
  const ranked = rankProducts(intent);
  const fits = ranked.filter((r) => r.fits);
  mem.query = text;
  const understood = chipsOf(intent)
    .map((c) => c.label)
    .join(", ");
  if (!fits.length) {
    const near = ranked[0].product;
    mem.last = near.id;
    return {
      say: [
        `Entendi: ${understood}. Nada no catálogo atende a tudo isso.`,
        `O mais próximo é o ${short(near)} (${brl(near.price)}), mas ${ranked[0].lacks.slice(0, 2).join(" e ")}.`,
      ],
      replies: [`Adicionar o ${short(near)}`, "Ver na busca", "Monte um kit"],
      action: { kind: "search", text },
    };
  }
  const [top, second] = fits;
  mem.last = top.product.id;
  const say = [`Entendi: ${understood}.`, `Minha escolha é o ${short(top.product)}, ${brl(top.product.price)}: ${specLine(top.product)}.`];
  if (second) say.push(`Também atende: ${short(second.product)} (${brl(second.product.price)}).`);
  return {
    say,
    replies: [
      `Adicionar o ${short(top.product)}`,
      second ? `Compare o ${short(top.product)} com o ${short(second.product)}` : "Ver na busca",
      `Monte um kit com o ${short(top.product)}`,
    ],
    action: { kind: "search", text },
  };
}

function compare(a: PulsoProduct, b: PulsoProduct, mem: EcoMemory): EcoStep {
  mem.pair = [a.id, b.id];
  const diff = b.price - a.price;
  const lines = [
    `${short(a)} × ${short(b)}: ${diff === 0 ? "mesmo preço" : `o ${short(diff > 0 ? a : b)} custa ${brl(Math.abs(diff))} a menos`}.`,
  ];
  const parts: string[] = [];
  const ab = (x?: number, y?: number, unit = "", better: "max" | "min" = "max") => {
    if (x === undefined || y === undefined || x === y) return null;
    const win = (better === "max" ? x > y : x < y) ? a : b;
    return `${short(win)} (${better === "max" ? Math.max(x, y) : Math.min(x, y)}${unit})`;
  };
  const bat = ab(a.specs.bateriaH, b.specs.bateriaH, " h");
  if (bat) parts.push(`mais bateria: ${bat}`);
  const peso = ab(a.specs.pesoG, b.specs.pesoG, " g", "min");
  if (peso) parts.push(`mais leve: ${peso}`);
  const lat = ab(a.specs.latenciaMs, b.specs.latenciaMs, " ms", "min");
  if (lat) parts.push(`menor latência: ${lat}`);
  if (a.specs.anc !== b.specs.anc) parts.push(`só o ${short(a.specs.anc ? a : b)} cancela ruído`);
  if (parts.length) lines.push(`${parts.join("; ")}.`);
  const v = verdicts([a, b]);
  if (v.length) lines.push(v.map((x) => `Para ${USE_LABEL[x.use]}: ${x.text}.`).join("\n"));
  return {
    say: lines,
    replies: ["Abrir a comparação", `Adicionar o ${short(a)}`, `Adicionar o ${short(b)}`],
    action: { kind: "compare", ids: [a.id, b.id] },
  };
}

function kit(text: string, mem: EcoMemory): EcoStep {
  const intent = parseIntent(text);
  const named = mentioned(text).map((id) => pulsoById(id)!).find((p) => p.category !== "acessórios");
  const use: PulsoUse | undefined = intent.uses[0];
  let base = named;
  if (!base && use) {
    base = rankProducts({ ...intent, category: undefined, worksWith: undefined }).find(
      (r) => r.fits && r.product.category !== "acessórios",
    )?.product;
  }
  base ??= pulsoById("one")!;
  const extras = PULSO_PRODUCTS.filter(
    (p) => p.worksWith?.includes(base.id) && (use ? p.uses.includes(use) : p.worksWith.length === 1),
  );
  const items: CartItem[] = [base, ...extras].map((p) => ({ productId: p.id, qty: 1 }));
  mem.kit = items;
  mem.last = base.id;
  const subtotal = [base, ...extras].reduce((n, p) => n + p.price, 0);
  const days = Math.max(...[base, ...extras].map((p) => p.shipDays));
  const forUse = use ? ` para ${USE_LABEL[use]}` : "";
  if (!extras.length) {
    return {
      say: [
        `Kit${forUse}: o ${short(base)} já resolve sozinho — nenhum acessório do catálogo foi feito para ele${use ? ` e serve para ${USE_LABEL[use]}` : ""}.`,
        `Total ${totalLine(subtotal)}`,
      ],
      replies: [`Adicionar o ${short(base)}`, "Monte um kit para viagem", "Prazo de entrega"],
    };
  }
  return {
    say: [
      `Kit${forUse}: ${[base, ...extras].map((p) => `${short(p)} (${brl(p.price)})`).join(" + ")}.`,
      `Total ${totalLine(subtotal)} Sai em até ${days} dias úteis.`,
    ],
    replies: ["Adicionar o kit", "Monte um kit para casa", "Tem em estoque?"],
  };
}

function stock(ids: string[], mem: EcoMemory): EcoStep {
  const list = ids.length ? ids.map((id) => pulsoById(id)!) : mem.last ? [pulsoById(mem.last)!] : [];
  if (!list.length) {
    const low = PULSO_PRODUCTS.filter((p) => p.stock <= 12).sort((a, b) => a.stock - b.stock);
    return {
      say: [
        "Todo o catálogo está disponível agora.",
        `Os mais apertados: ${low.map((p) => `${short(p)} (${p.stock} un.)`).join(", ")}.`,
      ],
      replies: ["Prazo de entrega", "Quero um fone para correr"],
    };
  }
  return {
    say: list.map(
      (p) =>
        `${p.name}: ${p.stock <= 6 ? `últimas ${p.stock} unidades` : `${p.stock} unidades em estoque`}, sai em até ${p.shipDays} dias úteis.`,
    ),
    replies: [`Adicionar o ${short(list[0])}`, "Prazo de entrega"],
  };
}

function delivery(ids: string[], cart: readonly CartItem[]): EcoStep {
  const s = cartSummary(cart);
  const say = [`Frete grátis a partir de ${brl(PULSO.freeShippingFrom)}; abaixo disso, ${brl(PULSO.flatShipping)} fixos.`];
  const list = ids.map((id) => pulsoById(id)!);
  if (list.length) say.push(list.map((p) => `${short(p)}: sai em até ${p.shipDays} dias úteis.`).join("\n"));
  if (s.count) {
    say.push(
      s.shipping === 0
        ? `Seu carrinho (${brl(s.subtotal)}) já tem frete grátis e sai em até ${s.shipDays} dias úteis.`
        : `Seu carrinho está em ${brl(s.subtotal)}: faltam ${brl(s.toFree)} para o frete grátis.`,
    );
  } else if (!list.length) say.push("Os acessórios saem em 2 dias úteis; a Bar, em 5.");
  say.push("Na demonstração, a entrega é só simulada.");
  const cheapest = PULSO_PRODUCTS.filter((p) => s.toFree > 0 && p.price >= s.toFree).sort((a, b) => a.price - b.price)[0];
  return {
    say,
    replies: s.count && s.shipping > 0 && cheapest ? [`Adicionar o ${short(cheapest)}`, "Ver meu carrinho"] : ["Ver meu carrinho", "Monte um kit"],
  };
}

function add(ids: string[], t: string, mem: EcoMemory, cart: readonly CartItem[]): EcoStep {
  const id = ids[0] ?? mem.last;
  const p = id ? pulsoById(id) : undefined;
  if (!p) return { say: ["Qual produto eu coloco no carrinho?"], replies: ["Adicionar o One", "Adicionar o Buds", "Adicionar o Run"] };
  const color = p.id === "one" ? colorIn(t) : undefined;
  const qty = Math.min(qtyIn(t), 5);
  const already = cart.filter((i) => i.productId === p.id).reduce((n, i) => n + i.qty, 0);
  if (already + qty > p.stock) return { say: [`Só temos ${p.stock} unidades do ${short(p)}, e ${already} já estão no seu carrinho.`], replies: ["Ver meu carrinho"] };
  mem.last = p.id;
  const after = cartSummary([...cart, { productId: p.id, qty }]);
  const colorText = p.id === "one" ? ` na cor ${(color ?? PULSO_ONE_COLORS[0]).name}` : "";
  return {
    say: [
      `Pronto: ${qty > 1 ? `${qty}× ` : ""}${p.name}${colorText} no carrinho.`,
      after.shipping === 0
        ? `Subtotal ${brl(after.subtotal)}, frete grátis.`
        : `Subtotal ${brl(after.subtotal)}. Faltam ${brl(after.toFree)} para o frete grátis.`,
    ],
    replies: ["Ver meu carrinho", p.id === "one" ? "Monte um kit com o One" : "Prazo de entrega"],
    action: { kind: "add", items: [{ productId: p.id, qty, ...(color ? { colorId: color.id } : {}) }] },
  };
}

export function ecoAnswer(text: string, mem: EcoMemory, cart: readonly CartItem[]): EcoStep {
  const t = norm(text);
  const ids = mentioned(t);

  if (/\b(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/.test(t) && t.length < 20) return { say: ["Oi! Me diga para que você quer o som — correr, viajar, trabalhar, jogar — e eu acho o produto certo."], replies: [...ECO.chips] };
  if (/\b(obrigad[oa]|valeu|brigad[oa])\b/.test(t)) return { say: ["De nada! Qualquer coisa, é só chamar."], replies: ["Ver meu carrinho"] };

  if (/\bkit\b/.test(t) && /\b(adiciona|adicionar|coloca|colocar|quero|levar|compra)/.test(t) && mem.kit) {
    const items = mem.kit;
    const s = cartSummary([...cart, ...items]);
    return {
      say: [`Kit no carrinho: ${items.map((i) => short(pulsoById(i.productId)!)).join(" + ")}.`, `Subtotal agora: ${brl(s.subtotal)}${s.shipping === 0 ? ", frete grátis" : ""}.`],
      replies: ["Ver meu carrinho", "Prazo de entrega"],
      action: { kind: "add", items },
    };
  }
  if (/\bkit\b|combo|conjunto/.test(t)) return kit(t, mem);
  if (/\b(compar|diferenca|versus|vs|ou o|melhor entre)/.test(t)) {
    const pair = ids.length >= 2 ? ids.slice(0, 2) : ids.length === 1 && mem.last && mem.last !== ids[0] ? [mem.last, ids[0]] : mem.pair;
    if (pair) return compare(pulsoById(pair[0])!, pulsoById(pair[1])!, mem);
  }
  if (/abrir (a )?compara/.test(t) && mem.pair) return { say: ["Abri a tabela completa na página."], replies: ["Ver meu carrinho"], action: { kind: "compare", ids: mem.pair } };
  if (/\b(adiciona|adicionar|adicione|coloca|colocar|bota|compra|comprar|levo|vou levar)\b/.test(t) || (/\bquero o\b/.test(t) && ids.length)) return add(ids, t, mem, cart);
  if (/\b(carrinho|sacola)\b/.test(t)) {
    const s = cartSummary(cart);
    return {
      say: s.count
        ? [`No carrinho: ${s.lines.map((l) => `${l.qty}× ${short(l.product)}`).join(", ")}.`, `Total ${totalLine(s.subtotal)}`]
        : ["Seu carrinho está vazio por enquanto."],
      replies: s.count ? ["Prazo de entrega"] : [...ECO.chips],
      action: { kind: "cart" },
    };
  }
  if (/\b(estoque|disponivel|disponiveis|tem (o|a|ainda)|unidades|acabou|esgot)/.test(t)) return stock(ids, mem);
  if (/\b(entrega|frete|prazo|chega|envio|enviar|correio)/.test(t)) return delivery(ids, cart);
  if (/\bver na busca\b/.test(t) && mem.query) return { say: ["Coloquei a sua pergunta na busca da página."], replies: [], action: { kind: "search", text: mem.query, go: true } };

  const rec = recommend(text, mem);
  if (rec) return rec;

  if (ids.length === 1) {
    const p = pulsoById(ids[0])!;
    mem.last = p.id;
    return {
      say: [`${p.name}, ${brl(p.price)}. ${p.text}`, `${specLine(p)}. ${p.stock <= 6 ? `Últimas ${p.stock} unidades.` : `${p.stock} em estoque.`}`],
      replies: [`Adicionar o ${short(p)}`, `Monte um kit com o ${short(p)}`, "Prazo de entrega"],
    };
  }
  return {
    say: [
      "Essa eu não sei responder — sou uma simulação com respostas montadas a partir do catálogo.",
      "Posso recomendar por uso, comparar dois produtos, montar um kit ou falar de estoque e entrega.",
    ],
    replies: [...ECO.chips],
  };
}
