/**
 * Sample data for the "Pulso" online-store demo. Everything here is fictional: the brand,
 * the products, the specs, the stock. No ratings or reviews on purpose (they would be fake).
 * The photos in /public/pulso were AI-generated as one studio series (2048×2048 + -1000).
 * This file is imported by both the page and the server endpoints (/api/mcp, UCP profile),
 * so it must stay free of browser-only code.
 */

export type PulsoImage = { src: string; small: string; alt: string; width: number; height: number };

const img = (name: string, alt: string): PulsoImage => ({
  src: `/pulso/${name}.jpg`,
  small: `/pulso/${name}-1000.jpg`,
  alt,
  width: 2048,
  height: 2048,
});

export const PULSO = {
  name: "Pulso",
  tagline: "Áudio que aprende com você.",
  domain: "pulso.audio",
  currency: "BRL",
  /** Orders at or above this subtotal ship free. */
  freeShippingFrom: 499,
  flatShipping: 24,
} as const;

export type PulsoUse = "corrida" | "academia" | "trabalho" | "viagem" | "casa" | "games";
export type PulsoCategory = "fones" | "caixas" | "acessórios";

export type PulsoProduct = {
  id: string;
  sku: string;
  name: string;
  category: PulsoCategory;
  /** One line for cards. */
  short: string;
  text: string;
  /** In BRL, whole reais. */
  price: number;
  image: PulsoImage;
  specs: {
    /** Hours of playback; absent for mains-powered or passive products. */
    bateriaH?: number;
    pesoG: number;
    anc: boolean;
    /** Ingress protection rating, e.g. "IPX4". */
    agua?: string;
    bluetooth?: string;
    /** Wireless latency in ms, where it matters. */
    latenciaMs?: number;
    microfones?: number;
  };
  uses: PulsoUse[];
  stock: number;
  /** Business days to ship. */
  shipDays: number;
  /** Ids of products this accessory is made for. */
  worksWith?: string[];
};

export const PULSO_PRODUCTS: PulsoProduct[] = [
  {
    id: "one",
    sku: "PLS-ONE",
    name: "Pulso One",
    category: "fones",
    short: "Over-ear com cancelamento de ruído adaptativo",
    text: "Conchas de alumínio usinado, 40 horas de bateria e cancelamento de ruído que se ajusta ao ambiente a cada instante.",
    price: 1899,
    image: img("one", "Fone over-ear Pulso One em grafite com anel violeta"),
    specs: { bateriaH: 40, pesoG: 285, anc: true, agua: "IPX4", bluetooth: "5.4", latenciaMs: 60, microfones: 8 },
    uses: ["trabalho", "viagem", "casa"],
    stock: 23,
    shipDays: 2,
  },
  {
    id: "buds",
    sku: "PLS-BUDS",
    name: "Pulso Buds",
    category: "fones",
    short: "Intra-auriculares com estojo de carga",
    text: "Nove horas por carga, 36 com o estojo, cancelamento de ruído e seis microfones para chamadas.",
    price: 899,
    image: img("buds", "Fones intra-auriculares Pulso Buds ao lado do estojo de carga aberto"),
    specs: { bateriaH: 36, pesoG: 55, anc: true, agua: "IPX5", bluetooth: "5.4", latenciaMs: 70, microfones: 6 },
    uses: ["trabalho", "viagem", "academia"],
    stock: 41,
    shipDays: 2,
  },
  {
    id: "run",
    sku: "PLS-RUN",
    name: "Pulso Run",
    category: "fones",
    short: "Esportivo de ouvido aberto",
    text: "Arco de titânio de 29 gramas que deixa o ouvido livre para ouvir a rua. À prova de suor e de chuva.",
    price: 699,
    image: img("run", "Fone esportivo de ouvido aberto Pulso Run com arco de titânio"),
    specs: { bateriaH: 12, pesoG: 29, anc: false, agua: "IP67", bluetooth: "5.4", microfones: 2 },
    uses: ["corrida", "academia"],
    stock: 17,
    shipDays: 3,
  },
  {
    id: "cube",
    sku: "PLS-CUBE",
    name: "Pulso Cube",
    category: "caixas",
    short: "Caixa de som portátil",
    text: "Som em 360 graus num cubo de tecido e alumínio, com 18 horas de bateria e resistência à água.",
    price: 1199,
    image: img("cube", "Caixa de som portátil Pulso Cube em tecido cinza com anel de luz violeta"),
    specs: { bateriaH: 18, pesoG: 680, anc: false, agua: "IPX7", bluetooth: "5.4", microfones: 4 },
    uses: ["casa", "viagem"],
    stock: 12,
    shipDays: 3,
  },
  {
    id: "bar",
    sku: "PLS-BAR",
    name: "Pulso Bar",
    category: "caixas",
    short: "Soundbar para TV e jogos",
    text: "Barra de som fina com sete alto-falantes e baixa latência para filmes e jogos.",
    price: 2499,
    image: img("bar", "Soundbar Pulso Bar com frente em tecido cinza"),
    specs: { pesoG: 2400, anc: false, bluetooth: "5.4", latenciaMs: 30 },
    uses: ["casa", "games"],
    stock: 6,
    shipDays: 5,
  },
  {
    id: "dock",
    sku: "PLS-DOCK",
    name: "Pulso Dock",
    category: "acessórios",
    short: "Base com carregamento por indução",
    text: "Suporte de alumínio que carrega o Pulso One enquanto ele descansa.",
    price: 349,
    image: img("dock", "Base de alumínio Pulso Dock com anel de luz violeta"),
    specs: { pesoG: 420, anc: false },
    uses: ["casa", "trabalho"],
    stock: 30,
    shipDays: 2,
    worksWith: ["one"],
  },
  {
    id: "case",
    sku: "PLS-CASE",
    name: "Pulso Case",
    category: "acessórios",
    short: "Estojo rígido de viagem",
    text: "Estojo oval de tecido para levar o Pulso One na mochila sem medo.",
    price: 199,
    image: img("case", "Estojo de viagem oval Pulso Case em tecido cinza"),
    specs: { pesoG: 180, anc: false },
    uses: ["viagem"],
    stock: 58,
    shipDays: 2,
    worksWith: ["one"],
  },
  {
    id: "link",
    sku: "PLS-LINK",
    name: "Pulso Link",
    category: "acessórios",
    short: "Transmissor USB-C de baixa latência",
    text: "Liga os fones ao console ou ao notebook com 20 milissegundos de atraso.",
    price: 279,
    image: img("link", "Transmissor USB-C Pulso Link com anel violeta"),
    specs: { pesoG: 4, anc: false, latenciaMs: 20 },
    uses: ["games", "trabalho"],
    stock: 35,
    shipDays: 2,
    worksWith: ["one", "buds"],
  },
];

/** Colourways of the Pulso One (the 3D hero). Only "grafite" has a studio photo. */
export const PULSO_ONE_COLORS = [
  { id: "grafite", name: "Grafite", body: "#3b3e46", ring: "#7a5cff", cushion: "#2b2d34", band: "#b9bcc4" },
  { id: "areia", name: "Areia", body: "#d9d0c1", ring: "#c98b5a", cushion: "#bdb3a3", band: "#e3ddd2" },
  { id: "nevoa", name: "Névoa", body: "#eceef2", ring: "#00c8f0", cushion: "#d8dce3", band: "#f4f5f7" },
] as const;

/** What is inside the Pulso One, outside → inside, for the exploded view. */
export const PULSO_ONE_PARTS = [
  { id: "arco", name: "Arco", note: "Alumínio escovado com almofada de tecido" },
  { id: "hastes", name: "Hastes", note: "Aço, com ajuste telescópico" },
  { id: "concha", name: "Concha", note: "Alumínio usinado, uma peça só" },
  { id: "anel", name: "Anel de luz", note: "Indica bateria, pareamento e modo de ruído" },
  { id: "microfones", name: "Microfones", note: "Oito, quatro por lado, para ruído e chamadas" },
  { id: "placa", name: "Placa e chip N1", note: "Processa o cancelamento de ruído no próprio fone" },
  { id: "bateria", name: "Bateria", note: "40 horas por carga" },
  { id: "driver", name: "Driver de 40 mm", note: "Diafragma de biocelulose" },
  { id: "almofada", name: "Almofada", note: "Espuma viscoelástica, troca sem ferramenta" },
] as const;

export const pulsoById = (id: string) => PULSO_PRODUCTS.find((p) => p.id === id);

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Shipping for a subtotal in BRL (deterministic demo rule). */
export const pulsoShipping = (subtotal: number) =>
  subtotal <= 0 ? 0 : subtotal >= PULSO.freeShippingFrom ? 0 : PULSO.flatShipping;

/** "Eco", the scripted AI salesperson of the demo (a simulation, not a live model). */
export const ECO = {
  name: "Eco",
  role: "vendedor de IA · simulação",
  greeting: "Oi! Sou o Eco. Diga como você ouve música e eu monto a melhor combinação para você.",
  chips: ["Quero um fone para correr", "Compare o One com o Buds", "Monte um kit para viagem"],
} as const;
