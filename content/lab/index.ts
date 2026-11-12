import type { Lang, Localized } from "@/lib/i18n/core";

/**
 * The public Lab (/laboratorio · /en/lab): interactive 3D experiments and technical notes.
 * Listing data and interface copy only — each item's body lives in its own file next to this
 * one (content/lab/<id>.ts), so the nav, which imports this module, never ships the articles.
 * (The dev-only pages under /lab are something else: app/lab, blocked in robots.txt.)
 */
type L = Localized<string>;

export const LAB_IDS = ["load-test", "semantic-search", "one-loop", "public-forms"] as const;
export type LabId = (typeof LAB_IDS)[number];
export type LabKind = "experiment" | "note";

export type LabItem = {
  id: LabId;
  kind: LabKind;
  slug: L;
  /** Headline, first line. */
  title: L;
  /** Headline, second line (gradient). */
  accent: L;
  /** Card text and meta description. */
  summary: L;
  /** Mono chips; the same in both languages. */
  tags: readonly string[];
};

export const LAB_ITEMS: readonly LabItem[] = [
  {
    id: "load-test",
    kind: "experiment",
    slug: { pt: "teste-de-carga", en: "load-test" },
    title: { pt: "Quanto o seu sistema", en: "How much can your" },
    accent: { pt: "aguenta?", en: "system take?" },
    summary: {
      pt: "Aumente o número de pessoas no site e veja um servidor único cair enquanto uma arquitetura escalável liga máquinas sozinha. Tempo de resposta, erros e máquinas ligadas, calculados ao vivo.",
      en: "Raise the number of people on the site and watch a single server fall over while a scalable architecture switches machines on by itself. Response time, errors and machines running, computed live.",
    },
    tags: ["three.js", "M/M/1", "autoscaling", "CDN"],
  },
  {
    id: "semantic-search",
    kind: "experiment",
    slug: { pt: "busca-semantica", en: "semantic-search" },
    title: { pt: "Como a IA encontra", en: "How AI finds" },
    accent: { pt: "a resposta certa.", en: "the right answer." },
    summary: {
      pt: "A central de ajuda de uma loja vira um mapa 3D. Faça uma pergunta e veja ela virar um vetor, achar os trechos mais próximos e responder citando a fonte, ou admitir que não sabe.",
      en: "A store's help center becomes a 3D map. Ask a question and watch it turn into a vector, find the closest passages and answer citing the source, or admit it doesn't know.",
    },
    tags: ["three.js", "TF-IDF", "PCA", "RAG"],
  },
  {
    id: "one-loop",
    kind: "note",
    slug: { pt: "um-loop-para-tudo", en: "one-loop-for-everything" },
    title: { pt: "Um loop só para", en: "One loop for" },
    accent: { pt: "todas as animações.", en: "every animation." },
    summary: {
      pt: "Por que este site tem um único requestAnimationFrame, como isso poupa o celular e ainda deixa a gente congelar o tempo para conferir cada quadro.",
      en: "Why this site has a single requestAnimationFrame, how that spares the phone and still lets us freeze time to check every frame.",
    },
    tags: ["requestAnimationFrame", "IntersectionObserver", "SVG"],
  },
  {
    id: "public-forms",
    kind: "note",
    slug: { pt: "formulario-sem-captcha", en: "forms-without-captcha" },
    title: { pt: "Formulário aberto,", en: "Open forms," },
    accent: { pt: "sem CAPTCHA e sem spam.", en: "no CAPTCHA, no spam." },
    summary: {
      pt: "As camadas que colocamos na frente de um formulário público: limite por IP com janela deslizante, armadilhas que o visitante não vê, filtros silenciosos e um IP que nunca é guardado.",
      en: "The layers we put in front of a public form: per-IP limits with a sliding window, traps visitors never see, silent filters and an IP address that is never stored.",
    },
    tags: ["rate limiting", "honeypot", "HMAC", "LGPD"],
  },
];

export const labById = (id: LabId): LabItem => LAB_ITEMS.find((item) => item.id === id)!;
export const LAB_EXPERIMENTS = LAB_ITEMS.filter((item) => item.kind === "experiment");
export const LAB_NOTES = LAB_ITEMS.filter((item) => item.kind === "note");
export const isLabId = (key: string): key is LabId => (LAB_IDS as readonly string[]).includes(key);

/* ---------------------------------------------------------------- links */

export const LAB_INDEX_PATH: Record<Lang, string> = { pt: "/laboratorio", en: "/en/lab" };

export type LabHrefs = { index: string; item(id: LabId): string };
const hrefsFor = (lang: Lang): LabHrefs => ({
  index: LAB_INDEX_PATH[lang],
  item: (id) => `${LAB_INDEX_PATH[lang]}/${labById(id).slug[lang]}`,
});
export const LAB_HREFS: Record<Lang, LabHrefs> = { pt: hrefsFor("pt"), en: hrefsFor("en") };

/* ---------------------------------------------------------------- interface copy */

export const LAB_UI = {
  name: { pt: "Lab", en: "Lab" },
  nav: {
    heading: { pt: "Experimentos e notas técnicas", en: "Experiments and technical notes" },
    experiments: { pt: "Experimentos 3D", en: "3D experiments" },
    notes: { pt: "Notas técnicas", en: "Technical notes" },
    all: { pt: "Ver o Lab", en: "See the Lab" },
  },
  kind: {
    experiment: { pt: "Experimento 3D", en: "3D experiment" },
    note: { pt: "Nota técnica", en: "Technical note" },
  },
  index: {
    metaTitle: { pt: "Lab — experimentos 3D e notas técnicas · MatsuHub", en: "Lab — 3D experiments and technical notes · MatsuHub" },
    metaDescription: {
      pt: "Experimentos 3D interativos e notas técnicas da MatsuHub: teste de carga, busca semântica com IA, desempenho de animações e proteção de formulários.",
      en: "Interactive 3D experiments and technical notes by MatsuHub: load testing, AI semantic search, animation performance and form protection.",
    },
    label: { pt: "Lab MatsuHub", en: "MatsuHub Lab" },
    title: { pt: "Experimentos para mexer,", en: "Experiments to play with," },
    accent: { pt: "notas que mostram como.", en: "notes that show how." },
    sub: {
      pt: "Protótipos 3D que funcionam de verdade e textos técnicos sobre o que a gente constrói. Veja um sistema aguentar (ou não) um pico de acessos, acompanhe uma IA procurando a resposta certa e leia como resolvemos problemas reais de engenharia.",
      en: "3D prototypes that actually run, and technical write-ups about what we build. Watch a system hold up (or not) under a traffic spike, follow an AI as it looks for the right answer, and read how we solve real engineering problems.",
    },
    experimentsLabel: { pt: "01 — Experimentos 3D", en: "01 — 3D experiments" },
    experimentsTitle: { pt: "Mexa nos números.", en: "Move the numbers." },
    experimentsLead: {
      pt: "Cada experimento roda um modelo de verdade no seu navegador. Os números mudam com o que você faz, e explicamos de onde vem cada um.",
      en: "Each experiment runs a real model in your browser. The numbers change with what you do, and we explain where each one comes from.",
    },
    notesLabel: { pt: "02 — Notas técnicas", en: "02 — Technical notes" },
    notesTitle: { pt: "Como a gente resolve.", en: "How we solve it." },
    notesLead: {
      pt: "Problemas reais que apareceram construindo este site, e o que fizemos com eles. Com código.",
      en: "Real problems we ran into while building this site, and what we did about them. With code.",
    },
    open: { pt: "Abrir experimento", en: "Open experiment" },
    read: { pt: "Ler nota", en: "Read note" },
    minutes: { pt: "{n} min de leitura", en: "{n} min read" },
  },
  item: {
    how: { pt: "Como funciona", en: "How it works" },
    more: { pt: "Mais do Lab", en: "More from the Lab" },
    ctaTitle: { pt: "Quer isso no seu produto?", en: "Want this in your product?" },
    ctaText: {
      pt: "A engenharia destes experimentos é a mesma que vai para os sistemas que construímos para clientes.",
      en: "The engineering behind these experiments is the same that goes into the systems we build for clients.",
    },
    ctaButton: { pt: "Falar com a gente", en: "Talk to us" },
    ctaSecondary: { pt: "Ver software sob medida", en: "See custom builds" },
  },
  og: {
    index: { pt: "Lab MatsuHub", en: "MatsuHub Lab" },
    alt: { pt: "Lab MatsuHub — experimentos 3D e notas técnicas", en: "MatsuHub Lab — 3D experiments and technical notes" },
  },
} as const;

/* ---------------------------------------------------------------- article bodies */

/** One block of a note or of an experiment's "how it works". Inline `code` spans use backticks. */
export type LabBlock =
  | { type: "h2"; text: L }
  | { type: "p"; text: L }
  | { type: "list"; items: readonly L[]; ordered?: boolean }
  | { type: "code"; code: string; caption?: L }
  | { type: "callout"; text: L };

/** Rough reading time of a body, in minutes. */
export function readingMinutes(blocks: readonly LabBlock[], lang: Lang): number {
  let words = 0;
  for (const b of blocks) {
    if (b.type === "list") for (const item of b.items) words += item[lang].split(/\s+/).length;
    else if (b.type === "code") words += b.code.split(/\s+/).length / 2;
    else words += b.text[lang].split(/\s+/).length;
  }
  return Math.max(1, Math.round(words / 200));
}

/* ---------------------------------------------------------------- client copy */

/** A `{ pt, en }` tree resolved to one language, for client components (they never get both). */
export type Resolved<T> =
  T extends Localized<infer U> ? U : T extends readonly (infer E)[] ? readonly Resolved<E>[] : T extends object ? { [K in keyof T]: Resolved<T[K]> } : T;

const isPair = (v: object): v is Localized<unknown> => {
  const keys = Object.keys(v);
  return keys.length === 2 && "pt" in v && "en" in v;
};

export function localize<T>(value: T, lang: Lang): Resolved<T> {
  if (Array.isArray(value)) return value.map((v) => localize(v, lang)) as Resolved<T>;
  if (value && typeof value === "object") {
    if (isPair(value)) return value[lang] as Resolved<T>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = localize(v, lang);
    return out as Resolved<T>;
  }
  return value as Resolved<T>;
}
