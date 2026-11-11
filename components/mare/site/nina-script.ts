import { brl, MAITRE, MARE, MARE_DISHES, MARE_TABLES, MARE_ZONES, type MareAllergen, type MareDish, type MareTable } from "@/content/mare";
import { ALLERGENS, currentComanda, SECTION, toSlot, type ReservePrefill, type Slot, SLOTS } from "./bus";

/**
 * Nina's script. Every answer is computed from content/mare.ts (dishes, allergens, prices,
 * tables), so it can never disagree with the menu or the salon. No model is called.
 */

export type NinaAction =
  | { kind: "comanda"; ids: string[] }
  | { kind: "avoid"; list: MareAllergen[] }
  | { kind: "show-table"; tableId: string }
  | { kind: "reserve"; prefill: ReservePrefill }
  | { kind: "scroll"; to: string };

export type NinaStep = { say: string[]; replies: string[]; action?: NinaAction };

export type NinaMemory = {
  avoid: MareAllergen[];
  dinnerTurn: number;
  dinner?: string[];
  flow?: "party" | "slot";
  zone?: "janela";
  party?: number;
  slot?: Slot;
  tableTurn: number;
  table?: string;
};

export const newMemory = (): NinaMemory => ({ avoid: [], dinnerTurn: 0, tableTurn: 0 });

export const NINA_START: NinaStep = { say: [MAITRE.greeting], replies: [...MAITRE.chips] };

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;

const people = (n: number) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`;

/* ---------------------------------------------------------------- allergens */

const ALLERGEN_WORDS: [MareAllergen, RegExp][] = [
  ["crustáceos", /crustace|camar|lagost|caranguej/],
  ["moluscos", /molusc|ostra|polvo|lula|marisco|mexilh/],
  ["peixe", /peixe/],
  ["castanhas", /castanh|caju|nozes|amendoim|amendoa/],
  ["leite", /leite|lactose|laticin|queijo/],
];

function findAllergen(text: string): MareAllergen | undefined {
  return ALLERGEN_WORDS.find(([, re]) => re.test(text))?.[0];
}

const safe = (d: MareDish, avoid: MareAllergen[]) => !d.allergens.some((a) => avoid.includes(a));

function allergyStep(a: MareAllergen, mem: NinaMemory): NinaStep {
  if (!mem.avoid.includes(a)) mem.avoid = [...mem.avoid, a];
  const ok = MARE_DISHES.filter((d) => safe(d, mem.avoid));
  const no = MARE_DISHES.filter((d) => d.allergens.includes(a));
  return {
    say: [
      `Anotado: nada com ${a}${mem.avoid.length > 1 ? ` (nem ${list(mem.avoid.filter((x) => x !== a))})` : ""}.`,
      `Pode pedir sem susto: ${list(ok.map((d) => d.name))}.\n\nEvite: ${list(no.map((d) => d.name))}.`,
      "Avise também na reserva: a cozinha trabalha com todos esses ingredientes e a equipe toma o cuidado extra.",
    ],
    replies: ["Destacar no cardápio", "Sugira um jantar para dois", "Quero reservar uma mesa de janela"],
  };
}

/* ---------------------------------------------------------------- dinner */

function dinnerStep(mem: NinaMemory): NinaStep {
  const pick = (course: MareDish["course"]) => MARE_DISHES.filter((d) => d.course === course && safe(d, mem.avoid));
  const starters = pick("entrada");
  const mains = pick("principal");
  const desserts = pick("sobremesa");
  const n = mem.dinnerTurn++;
  const starter = starters.length ? starters[n % starters.length] : undefined;
  const two = mains.length >= 2 ? [mains[n % mains.length], mains[(n + 1) % mains.length]] : mains;
  const dessert = desserts.length ? desserts[n % desserts.length] : undefined;
  const chosen = [starter, ...two, dessert].filter((d): d is MareDish => Boolean(d));
  if (chosen.length === 0) {
    return {
      say: ["Com essas restrições não tenho um jantar completo para sugerir. Fale com a equipe na reserva: a cozinha adapta."],
      replies: ["Quero reservar uma mesa de janela"],
    };
  }
  mem.dinner = chosen.map((d) => d.id);
  const total = chosen.reduce((s, d) => s + d.price, 0);
  const lines = [
    starter && `• Entrada para dividir: ${starter.name} (${brl(starter.price)})`,
    two.length && `• ${two.length > 1 ? "Principais" : "Principal"}: ${list(two.map((d) => `${d.name} (${brl(d.price)})`))}`,
    dessert && `• Sobremesa para dividir: ${dessert.name} (${brl(dessert.price)})`,
  ].filter(Boolean);
  const wine = two[0] ?? starter;
  return {
    say: [
      `${mem.avoid.length ? `Sem ${list(mem.avoid)}, para dois` : "Para dois"}, eu faria assim:\n${lines.join("\n")}`,
      `Total: ${brl(total)}.${wine ? ` Para beber: ${wine.pairing}, a harmonização da casa para o ${wine.name.toLowerCase()}.` : ""}`,
    ],
    replies: ["Adicionar à comanda", "Outra sugestão", "Quero reservar uma mesa de janela"],
  };
}

/* ---------------------------------------------------------------- reservation */

const NUMBER_WORDS: [RegExp, number][] = [
  [/\b(so eu|sozinh|uma pessoa|1 pessoa)\b/, 1],
  [/\b(duas|dois|casal|2)\b/, 2],
  [/\b(tres|3)\b/, 3],
  [/\b(quatro|4)\b/, 4],
  [/\b(cinco|5)\b/, 5],
  [/\b(seis|6)\b/, 6],
  [/\b(sete|7)\b/, 7],
  [/\b(oito|8)\b/, 8],
  [/\b(nove|9)\b/, 9],
  [/\b(dez|10)\b/, 10],
];

const parseParty = (text: string) => NUMBER_WORDS.find(([re]) => re.test(text))?.[1];

/** Tables that fit, preferred zone first, the ones with a note (the house's favourites) first. */
function candidates(mem: NinaMemory): MareTable[] {
  const party = mem.party ?? 2;
  const fits = MARE_TABLES.filter((t) => t.seats >= party);
  const zone = fits.filter((t) => t.zone === mem.zone);
  const pool = zone.length ? zone : fits.sort((a, b) => a.seats - b.seats);
  return [...pool.filter((t) => t.note), ...pool.filter((t) => !t.note)];
}

function proposeTable(mem: NinaMemory): NinaStep {
  const options = candidates(mem);
  const party = mem.party ?? 2;
  if (options.length === 0) {
    return {
      say: [`Para ${people(party)} a gente organiza um espaço especial. Deixe o pedido no formulário que a equipe responde pelo WhatsApp.`],
      replies: ["Reservar"],
      action: { kind: "reserve", prefill: { party, slot: mem.slot } },
    };
  }
  const t = options[mem.tableTurn++ % options.length];
  mem.table = t.id;
  const zone = MARE_ZONES.find((z) => z.id === t.zone)!;
  const wantedWindow = mem.zone === "janela" && t.zone !== "janela";
  return {
    say: [
      wantedWindow
        ? `As mesas de janela são para dois. Para ${people(party)} às ${mem.slot}, minha sugestão é ${t.label}, no ${zone.name.toLowerCase()}: ${(t.note ?? zone.note).toLowerCase()}.`
        : `Para ${people(party)} às ${mem.slot}, minha sugestão é ${t.label}: ${(t.note ?? zone.note).toLowerCase()}.`,
      "Quer ver onde fica no salão ou já deixo a reserva preenchida?",
    ],
    replies: options.length > 1 ? ["Ver no mapa", "Reservar", "Outra mesa"] : ["Ver no mapa", "Reservar"],
  };
}

function reserveStart(mem: NinaMemory, window: boolean): NinaStep {
  mem.zone = window ? "janela" : undefined;
  mem.flow = "party";
  mem.tableTurn = 0;
  const windows = MARE_TABLES.filter((t) => t.zone === "janela");
  return {
    say: [
      window
        ? `Boa escolha: são ${windows.length} mesas junto ao vidro, com o mar logo abaixo. Para quantas pessoas?`
        : "Claro. Para quantas pessoas?",
    ],
    replies: ["Duas pessoas", "Quatro pessoas", "Seis pessoas"],
  };
}

/* ---------------------------------------------------------------- order (comanda) */

function orderSummary() {
  const { lines, total } = currentComanda();
  return { lines, total, text: lines.map((l) => `${l.qty}× ${l.dish.name}`).join(", ") };
}

export function orderStep(): NinaStep {
  const { lines, total } = orderSummary();
  if (lines.length === 0) {
    return {
      say: ["Sua comanda ainda está vazia. Quer que eu monte um jantar?"],
      replies: ["Sugira um jantar para dois"],
    };
  }
  return {
    say: [
      `Recebi sua comanda:\n${lines.map((l) => `• ${l.qty}× ${l.dish.name} (${brl(l.qty * l.dish.price)})`).join("\n")}\nTotal: ${brl(total)}.`,
      "Posso anotar o pedido junto da sua reserva, para a cozinha já se preparar. Ou sugiro o vinho de cada prato.",
    ],
    replies: ["Anotar na reserva", "Sugira os vinhos", "Quero reservar uma mesa de janela"],
  };
}

function winesStep(mem: NinaMemory): NinaStep {
  const { lines } = orderSummary();
  const dishes = lines.length
    ? lines.map((l) => l.dish)
    : (mem.dinner ?? []).map((id) => MARE_DISHES.find((d) => d.id === id)!).filter(Boolean);
  const source = dishes.length ? dishes : MARE_DISHES;
  return {
    say: [`${dishes.length ? "Para o seu pedido" : "A carta conversa com os pratos assim"}:\n${source.map((d) => `• ${d.name} → ${d.pairing}`).join("\n")}`],
    replies: lines.length ? ["Anotar na reserva", "Quero reservar uma mesa de janela"] : ["Sugira um jantar para dois", "Quero reservar uma mesa de janela"],
  };
}

/* ---------------------------------------------------------------- router */

const CHIPS: string[] = [...MAITRE.chips];

export function ninaAnswer(raw: string, mem: NinaMemory): NinaStep {
  const text = plain(raw);

  // inside the reservation flow
  if (mem.flow === "party") {
    const n = parseParty(text);
    if (n) {
      mem.party = n;
      mem.flow = "slot";
      return { say: [`${people(n)}, anotado. Qual horário?`], replies: [...SLOTS] };
    }
  }
  if (mem.flow === "slot") {
    const s = toSlot(text.match(/\d{1,2}(h|:)?\d{0,2}/)?.[0]);
    if (s) {
      mem.slot = s;
      mem.flow = undefined;
      return proposeTable(mem);
    }
  }

  if (/^adicionar a comanda/.test(text) && mem.dinner) {
    const ids = mem.dinner;
    const extra = ids.reduce((s, id) => s + (MARE_DISHES.find((d) => d.id === id)?.price ?? 0), 0);
    return {
      say: [`Pronto: ${ids.length} pratos na comanda (${brl(extra)}). Você pode ajustar as quantidades no cardápio.`],
      replies: ["Quero reservar uma mesa de janela", "Sugira os vinhos"],
      action: { kind: "comanda", ids },
    };
  }
  if (/^outra sugestao/.test(text)) return dinnerStep(mem);
  if (/^outra mesa/.test(text) && mem.party) return proposeTable(mem);
  if (/^ver no mapa/.test(text) && mem.table) {
    const t = MARE_TABLES.find((x) => x.id === mem.table)!;
    return {
      say: [`Mostrando ${t.label} no salão, lá em cima.`],
      replies: ["Reservar", "Outra mesa"],
      action: { kind: "show-table", tableId: t.id },
    };
  }
  if (/^reservar$/.test(text)) {
    const t = MARE_TABLES.find((x) => x.id === mem.table);
    return {
      say: [
        `Deixei o formulário preenchido${t ? `: ${t.label}` : ""}${mem.slot ? `, às ${mem.slot}` : ""}${mem.party ? `, para ${people(mem.party)}` : ""}. Falta só a data, o seu nome e o WhatsApp.`,
      ],
      replies: ["Sugira um jantar para dois"],
      action: { kind: "reserve", prefill: { tableId: t?.id, slot: mem.slot, party: mem.party } },
    };
  }
  if (/^anotar na reserva/.test(text)) {
    const { lines, total, text: order } = orderSummary();
    if (lines.length === 0) return orderStep();
    const note = mem.avoid.length ? ` Restrição: sem ${list(mem.avoid)}.` : "";
    return {
      say: ["Anotei o pedido nas observações da reserva. Falta escolher o dia e o horário."],
      replies: ["Sugira os vinhos"],
      action: { kind: "reserve", prefill: { message: `Pedido antecipado: ${order} (${brl(total)}).${note}` } },
    };
  }
  if (/^destacar no cardapio/.test(text)) {
    return {
      say: [mem.avoid.length ? `Pronto: no cardápio, os pratos com ${list(mem.avoid)} ficaram apagados.` : "Me diga primeiro o que você precisa evitar."],
      replies: mem.avoid.length ? ["Sugira um jantar para dois", "Quero reservar uma mesa de janela"] : ALLERGENS.map((a) => `Tenho alergia a ${a}`),
      action: mem.avoid.length ? { kind: "avoid", list: mem.avoid } : undefined,
    };
  }

  if (/alerg|intoler|evitar|nao como|nao posso/.test(text)) {
    const a = findAllergen(text);
    if (a) return allergyStep(a, mem);
    return { say: ["Claro. Qual destes você precisa evitar?"], replies: ALLERGENS.map((x) => `Tenho alergia a ${x}`) };
  }
  if (/vinho|harmoniz|beber/.test(text)) return winesStep(mem);
  if (/jantar|sugir|sugest|indica|recomend|cardapio|prato/.test(text)) return dinnerStep(mem);
  if (/reserv|mesa|janela|lugar/.test(text)) return reserveStart(mem, /janela|vista|mar/.test(text));
  if (/horario|abre|aberto|funciona|fecha/.test(text)) {
    return {
      say: [`Abrimos assim:\n${MARE.hours.map((h) => `• ${h.days}: ${h.time}`).join("\n")}`],
      replies: ["Quero reservar uma mesa de janela", "Sugira um jantar para dois"],
    };
  }
  if (/onde|endereco|chegar|local|estaciona/.test(text)) {
    return {
      say: [`Estamos na ${MARE.address}. Os detalhes de como chegar estão logo abaixo, no fim da página.`],
      replies: ["Quero reservar uma mesa de janela"],
      action: { kind: "scroll", to: SECTION.where },
    };
  }
  const a = findAllergen(text);
  if (a && /sem |tenho/.test(text)) return allergyStep(a, mem);

  return {
    say: ["Ainda sou uma simulação e entendo poucas coisas. Posso ajudar com uma destas?"],
    replies: CHIPS,
  };
}
