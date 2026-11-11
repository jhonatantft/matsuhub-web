import { brl, PULSO_PRODUCTS, pulsoById, type PulsoCategory, type PulsoProduct, type PulsoUse } from "@/content/pulso";

/**
 * "Busca por intenção": a small rule-based parser over pt-BR plus a text-similarity ranking.
 * Pure functions, runs in the browser, no model and no network.
 *
 *   parseIntent(text)  → the constraints it understood (each becomes a removable chip)
 *   rankProducts(i)    → every product with what it meets / lacks and one computed line
 */

export type Intent = {
  uses: PulsoUse[];
  category?: PulsoCategory;
  maxPrice?: number;
  /** Hours, from a number in the text ("pelo menos 20 h"). */
  minBattery?: number;
  /** "bateria longa": a preference, ranks by hours. */
  longBattery?: boolean;
  maxWeight?: number;
  light?: boolean;
  anc?: boolean;
  /** Minimum water level, the last digit of the IP code (4 = respingos, 7 = submersão). */
  water?: number;
  lowLatency?: boolean;
  calls?: boolean;
  /** Accessory made for this product id. */
  worksWith?: string;
  /** Cheaper first. */
  cheap?: boolean;
  /** Leftover words used for the similarity score. */
  words: string[];
};

export type ChipKey =
  | `use:${PulsoUse}`
  | "category"
  | "maxPrice"
  | "minBattery"
  | "longBattery"
  | "maxWeight"
  | "light"
  | "anc"
  | "water"
  | "lowLatency"
  | "calls"
  | "worksWith"
  | "cheap";

export type Chip = { key: ChipKey; label: string };

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'");

const USE_WORDS: Record<PulsoUse, RegExp> = {
  corrida: /\b(corr(er|ida|idas|o|endo)|running|cooper|maratona|trilha|pedal|bike|ciclismo)\b/,
  academia: /\b(academia|treino|treinar|malhar|musculacao|crossfit|esporte|exercicio)\b/,
  trabalho: /\b(trabalho|trabalhar|escritorio|home ?office|reuni(ao|oes)|foco|estudar|estudo)\b/,
  viagem: /\b(viage(m|ns)|viajar|aviao|voo|voos|onibus|aeroporto|mochila)\b/,
  casa: /\b(casa|sala|tv|televisao|filmes?|series?|festa|churrasco|ambiente)\b/,
  games: /\b(games?|jogos?|jogar|gamer|console|playstation|ps5|xbox|switch)\b/,
};

export const USE_LABEL: Record<PulsoUse, string> = {
  corrida: "corrida",
  academia: "academia",
  trabalho: "trabalho",
  viagem: "viagem",
  casa: "casa",
  games: "games",
};

const CATEGORY_WORDS: [PulsoCategory, RegExp][] = [
  ["acessórios", /\b(acessorios?|estojo|case|capa|base|suporte|dock|carregador|transmissor|dongle|adaptador)\b/],
  ["caixas", /\b(caixas?( de som)?|caixinha|speaker|soundbar|barra de som)\b/],
  ["fones", /\b(fones?( de ouvido)?|headphones?|headset|earbuds?|intra|in-?ear|over-?ear|auriculares?)\b/],
];

const CATEGORY_LABEL: Record<PulsoCategory, string> = { fones: "fones", caixas: "caixas de som", acessórios: "acessórios" };

const STOP = new Set(
  "a o as os um uma uns umas de da do das dos em no na nos nas para pra pro com sem e ou que eu meu minha quero queria procuro preciso busco algo coisa um bom boa bem mais muito muita por ate abaixo acima menos r reais mil horas hora h g gramas".split(
    " ",
  ),
);

/** "1.299", "1299,90", "1 mil", "1,5 mil" → reais */
function money(raw: string, mil?: string) {
  let n: number;
  if (mil) n = Number(raw.replace(",", ".")) * 1000;
  else n = Number(raw.replace(/\.(?=\d{3}\b)/g, "").replace(/,\d{1,2}$/, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export function parseIntent(input: string): Intent {
  let t = ` ${norm(input)} `;
  const intent: Intent = { uses: [], words: [] };
  const eat = (re: RegExp) => {
    t = t.replace(re, " ");
  };

  // compatibility first ("para o One", "compatível com o Buds") so the product name is not read as a category
  const compat = t.match(/\b(?:para|pra|pro|do|compativel com|que funcione com|feito para)\s+(?:o\s+|meu\s+)?(?:pulso\s+)?(one|buds)\b/);
  if (compat) {
    intent.worksWith = compat[1];
    eat(new RegExp(compat[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  // budget: "até R$ 800", "abaixo de 1.000", "no máximo 1 mil", "menos de 900 reais", or a bare "R$ 800"
  const budget =
    t.match(/\b(?:ate|abaixo de|menos de|no maximo|maximo|max|nao passe de|custando ate|por ate|teto de)\s*(?:uns\s*)?(?:r\$\s*)?(\d[\d.,]*)(?![\d.,])\s*(mil\b)?(?!\s*(?:h|hs|horas?|g|gramas|ms)\b)/) ??
    t.match(/r\$\s*(\d[\d.,]*)\s*(mil)?/) ??
    t.match(/\b(\d[\d.,]*)\s*(mil)?\s*reais\b/);
  if (budget) {
    const value = money(budget[1], budget[2]);
    if (value) intent.maxPrice = value;
    eat(budget[0].includes("$") ? /(?:\b(?:ate|abaixo de|menos de|no maximo|maximo|max|por ate)\s*)?r\$\s*\d[\d.,]*\s*(?:mil)?/ : new RegExp(budget[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  if (/\b(barat[oa]s?|economico|em conta|custo beneficio|mais em conta)\b/.test(t)) intent.cheap = true;

  // battery: an explicit number of hours, or "bateria longa"
  const hours = t.match(/\b(?:pelo menos|minimo de|mais de|acima de|no minimo)?\s*(\d{1,3})\s*(?:h|hs|horas?)\b(?:\s*de bateria)?/);
  if (hours) {
    intent.minBattery = Number(hours[1]);
    eat(new RegExp(hours[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } else if (/\b(bateria (longa|boa|grande|que dure|duradoura)|muita bateria|dure (muito|o dia)|autonomia|longa duracao|bateria)\b/.test(t)) {
    intent.longBattery = true;
  }

  // weight
  const grams = t.match(/\b(?:ate|menos de|abaixo de|no maximo)\s*(\d{1,4})\s*(?:g|gramas)\b/);
  if (grams) {
    intent.maxWeight = Number(grams[1]);
    eat(new RegExp(grams[0]));
  } else if (/\b(lev[ei]s?|levinho|levissimo|pes[ae] pouco|nao pes[ae])\b/.test(t)) intent.light = true;

  // noise cancelling, water, latency, calls
  if (/\b(cancelamento( de ruido)?|cancela(r)? (o )?(ruido|barulho)|anc|silencio|isol(ar|amento)|abafa|barulho|ruido)\b/.test(t)) intent.anc = true;
  if (/(prova d'? ?agua|a prova de agua|submers|piscina|nadar|banho|ipx?7|ip67)/.test(t)) intent.water = 7;
  else if (/\b(resistente a agua|agua|chuva|suor|suar|respingos?|molhar)\b/.test(t)) intent.water = 4;
  if (/\b(baixa latencia|latencia|sem atraso|atraso|delay|lag)\b/.test(t)) intent.lowLatency = true;
  if (/\b(chamadas?|ligac(ao|oes)|microfones?|calls?|videochamadas?)\b/.test(t)) intent.calls = true;

  for (const use of Object.keys(USE_WORDS) as PulsoUse[]) if (USE_WORDS[use].test(t)) intent.uses.push(use);
  for (const [cat, re] of CATEGORY_WORDS) {
    if (re.test(t)) {
      intent.category = cat;
      break;
    }
  }
  // an accessory "para o One" is an accessory even when the visitor did not say the word
  if (intent.worksWith && !intent.category) intent.category = "acessórios";

  intent.words = t
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return intent;
}

export function chipsOf(i: Intent): Chip[] {
  const chips: Chip[] = [];
  if (i.category) chips.push({ key: "category", label: CATEGORY_LABEL[i.category] });
  for (const u of i.uses) chips.push({ key: `use:${u}`, label: `para ${USE_LABEL[u]}` });
  if (i.worksWith) chips.push({ key: "worksWith", label: `para o ${pulsoById(i.worksWith)?.name.replace("Pulso ", "") ?? i.worksWith}` });
  if (i.maxPrice) chips.push({ key: "maxPrice", label: `até ${brl(i.maxPrice)}` });
  if (i.cheap) chips.push({ key: "cheap", label: "mais em conta" });
  if (i.minBattery) chips.push({ key: "minBattery", label: `bateria ≥ ${i.minBattery} h` });
  if (i.longBattery) chips.push({ key: "longBattery", label: "bateria longa" });
  if (i.maxWeight) chips.push({ key: "maxWeight", label: `até ${i.maxWeight} g` });
  if (i.light) chips.push({ key: "light", label: "leve" });
  if (i.anc) chips.push({ key: "anc", label: "cancelamento de ruído" });
  if (i.water) chips.push({ key: "water", label: i.water >= 7 ? "à prova d'água" : "resiste a suor e chuva" });
  if (i.lowLatency) chips.push({ key: "lowLatency", label: "baixa latência" });
  if (i.calls) chips.push({ key: "calls", label: "chamadas" });
  return chips;
}

/** The intent with the removed chips taken out. */
export function withoutChips(i: Intent, removed: ReadonlySet<ChipKey>): Intent {
  const next: Intent = { ...i, uses: i.uses.filter((u) => !removed.has(`use:${u}`)) };
  for (const key of removed) if (!key.startsWith("use:")) delete next[key as Exclude<ChipKey, `use:${string}`>];
  return next;
}

export const isEmptyIntent = (i: Intent) => chipsOf(i).length === 0 && i.words.length === 0;

/* ---------------------------------------------------------------- ranking */

const waterLevel = (p: PulsoProduct) => {
  const code = p.specs.agua;
  return code ? Number(code.slice(-1)) || 0 : 0;
};

const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);
const DOCS = new Map(
  PULSO_PRODUCTS.map((p) => [
    p.id,
    new Set(
      norm(`${p.name} ${p.short} ${p.text} ${p.category} ${p.uses.join(" ")}`)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
        .map(stem),
    ),
  ]),
);

/** Share of the leftover query words that appear in the product text (prefix-stemmed). */
function similarity(p: PulsoProduct, words: string[]) {
  if (!words.length) return 0;
  const doc = DOCS.get(p.id)!;
  let hit = 0;
  for (const w of words) if (doc.has(stem(w))) hit++;
  return hit / words.length;
}

export type Ranked = {
  product: PulsoProduct;
  fits: boolean;
  score: number;
  /** Hard constraints the product misses, as short phrases. */
  lacks: string[];
  /** Constraint keys missed (to say what was relaxed). */
  missed: ChipKey[];
  /** One computed line. */
  line: string;
};

export function rankProducts(i: Intent): Ranked[] {
  const maxBattery = Math.max(...PULSO_PRODUCTS.map((p) => p.specs.bateriaH ?? 0));
  const out = PULSO_PRODUCTS.map((p, order): Ranked => {
    const lacks: string[] = [];
    const missed: ChipKey[] = [];
    const good: string[] = [];
    const miss = (key: ChipKey, text: string) => {
      missed.push(key);
      lacks.push(text);
    };
    const s = p.specs;
    let score = 0;

    if (i.category) {
      if (p.category === i.category) score += 1;
      else miss("category", `é ${p.category === "caixas" ? "caixa de som" : p.category === "fones" ? "fone" : "acessório"}`);
    }
    for (const u of i.uses) {
      if (p.uses.includes(u)) {
        score += 2;
        good.push(`feito para ${USE_LABEL[u]}`);
      } else miss(`use:${u}`, `não é pensado para ${USE_LABEL[u]}`);
    }
    if (i.worksWith) {
      if (p.worksWith?.includes(i.worksWith)) {
        score += 2;
        good.push(`compatível com o ${pulsoById(i.worksWith)?.name.replace("Pulso ", "")}`);
      } else miss("worksWith", `não é acessório do ${pulsoById(i.worksWith)?.name.replace("Pulso ", "")}`);
    }
    if (i.maxPrice) {
      if (p.price <= i.maxPrice) {
        score += 0.5;
        good.push(`${brl(p.price)}, dentro do orçamento`);
      } else miss("maxPrice", `custa ${brl(p.price)}, ${brl(p.price - i.maxPrice)} acima`);
    }
    if (i.minBattery) {
      if ((s.bateriaH ?? 0) >= i.minBattery) good.push(`${s.bateriaH} h de bateria`);
      else miss("minBattery", s.bateriaH ? `só ${s.bateriaH} h de bateria` : "não tem bateria");
    }
    if (i.longBattery) {
      if (s.bateriaH) {
        score += (s.bateriaH / maxBattery) * 1.5;
        good.push(`${s.bateriaH} h de bateria`);
      } else miss("longBattery", "não tem bateria");
    }
    if (i.maxWeight) {
      if (s.pesoG <= i.maxWeight) good.push(`${s.pesoG} g`);
      else miss("maxWeight", `pesa ${s.pesoG} g`);
    }
    if (i.light) {
      score += Math.max(0, 1 - s.pesoG / 400);
      if (s.pesoG <= 100) good.push(`só ${s.pesoG} g`);
    }
    if (i.anc) {
      if (s.anc) good.push("cancelamento de ruído");
      else miss("anc", "sem cancelamento de ruído");
    }
    if (i.water) {
      if (waterLevel(p) >= i.water) good.push(`${s.agua}`);
      else miss("water", s.agua ? `só ${s.agua}` : "sem proteção contra água");
    }
    if (i.lowLatency) {
      if (s.latenciaMs && s.latenciaMs <= 30) {
        score += 1;
        good.push(`${s.latenciaMs} ms de latência`);
      } else miss("lowLatency", s.latenciaMs ? `latência de ${s.latenciaMs} ms` : "latência não informada");
    }
    if (i.calls) {
      if ((s.microfones ?? 0) >= 2) {
        score += (s.microfones ?? 0) / 8;
        good.push(`${s.microfones} microfones`);
      } else miss("calls", "sem microfone");
    }
    if (i.cheap) score += 1 - p.price / 2500;
    score += similarity(p, i.words) * 1.5;
    // stable tiebreak: catalogue order
    score -= order * 0.001;

    const fits = missed.length === 0;
    const line = fits
      ? good.length
        ? cap(good.slice(0, 3).join(" · "))
        : cap(p.short)
      : `Falta: ${lacks.slice(0, 2).join(" · ")}`;
    return { product: p, fits, score, lacks, missed, line };
  });

  return out.sort((a, b) => Number(b.fits) - Number(a.fits) || a.missed.length - b.missed.length || b.score - a.score);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const RELAX_LABEL = (key: ChipKey, i: Intent): string => {
  if (key.startsWith("use:")) return `o uso (${USE_LABEL[key.slice(4) as PulsoUse]})`;
  switch (key) {
    case "category":
      return `a categoria (${i.category ? CATEGORY_LABEL[i.category] : ""})`;
    case "maxPrice":
      return `o orçamento (${brl(i.maxPrice ?? 0)})`;
    case "minBattery":
      return `a bateria mínima (${i.minBattery} h)`;
    case "maxWeight":
      return `o peso máximo (${i.maxWeight} g)`;
    case "anc":
      return "o cancelamento de ruído";
    case "water":
      return "a resistência à água";
    case "lowLatency":
      return "a latência baixa";
    case "worksWith":
      return "a compatibilidade";
    case "calls":
      return "os microfones";
    default:
      return "um filtro";
  }
};

/** When nothing fits: the nearest product and which constraints were relaxed to reach it. */
export function nearest(ranked: Ranked[], i: Intent) {
  const best = ranked[0];
  if (!best || best.fits) return null;
  return { product: best.product, relaxed: best.missed.map((k) => RELAX_LABEL(k, i)), lacks: best.lacks };
}

export const EXAMPLES = [
  "fone para correr com bateria longa até R$ 800",
  "cancelamento de ruído para viagem até R$ 1.000",
  "caixa de som à prova d'água para levar na viagem",
  "acessório para o One até R$ 300",
] as const;
