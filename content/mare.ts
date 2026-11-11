/**
 * Sample data for the "Maré" restaurant demo. Everything here is fictional.
 * The images in /public/mare were AI-generated. `salon` (a cut-away model seen from above)
 * is the master layout: the facade and every view were generated FROM it, so they match.
 * Any new picture of this restaurant must be generated the same way and compared with it.
 */

export type MareImage = { src: string; small: string; alt: string; width: number; height: number };

const wide = (name: string, alt: string): MareImage => ({
  src: `/mare/${name}.jpg`,
  small: `/mare/${name}-1600.jpg`,
  alt,
  width: 2688,
  height: 1520,
});
const square = (name: string, alt: string): MareImage => ({
  src: `/mare/${name}.jpg`,
  small: `/mare/${name}-1000.jpg`,
  alt,
  width: 2048,
  height: 2048,
});

export const MARE = {
  name: "Maré",
  tagline: "Fogo & mar",
  claim: "Cozinha de brasa, de frente para o mar.",
  domain: "mare-restaurante.com.br",
  address: "Av. Beira-Mar, 1200 · Praia do Sol",
  hours: [
    { days: "Quarta a sexta", time: "18h às 23h" },
    { days: "Sábado", time: "12h às 16h · 18h às 23h30" },
    { days: "Domingo", time: "12h às 17h" },
  ],
  facts: [
    { value: "Brasa", label: "fogo a lenha, à vista" },
    { value: "58", label: "lugares" },
    { value: "Do dia", label: "peixe da costa" },
    { value: "Qua–Dom", label: "jantar e almoço" },
  ],
} as const;

export const MARE_MEDIA = {
  /** Outside the entrance (front-left corner of the model), at blue hour. */
  facade: wide("facade", "Entrada do restaurante Maré ao anoitecer, com a porta aberta e o mar ao lado"),
  /** The master layout: cut-away model of the whole restaurant, sea along the bottom edge. */
  salon: wide("salon", "Salão do Maré em corte, visto de cima: bar, cozinha aberta, mesas, adega e terraço"),
  /** The whole room seen from the window side. */
  panorama: wide("view-panorama", "O salão do Maré visto a partir das mesas de janela"),
} as const;

export type MareZoneId = "janela" | "salao" | "balcao" | "bar" | "terraco" | "adega";

/** Areas of the restaurant, each with the photo taken from it. */
export const MARE_ZONES: { id: MareZoneId; name: string; note: string; bookable: boolean; view: MareImage }[] = [
  {
    id: "janela",
    name: "Mesas de janela",
    note: "Cinco mesas para dois, com o mar logo abaixo do vidro",
    bookable: true,
    view: wide("view-janela", "Mesa para dois junto ao vidro, com o mar ao anoitecer"),
  },
  {
    id: "salao",
    name: "Salão",
    note: "Mesas redondas e a mesa comunitária de carvalho, de frente para a brasa",
    bookable: true,
    view: wide("view-salao", "Salão com a mesa comunitária ao centro e a cozinha aberta ao fundo"),
  },
  {
    id: "balcao",
    name: "Balcão do chef",
    note: "Seis lugares de frente para o fogo",
    bookable: true,
    view: wide("view-chef", "Balcão de pedra em frente à grelha a lenha e à coifa de cobre"),
  },
  {
    id: "bar",
    name: "Bar",
    note: "Balcão de mármore, sem reserva: é chegar e sentar",
    bookable: false,
    view: wide("view-bar", "Bar de mármore com banquetas e garrafas iluminadas"),
  },
  {
    id: "terraco",
    name: "Terraço",
    note: "Lounges sob a pérgola, ao lado do mar",
    bookable: true,
    view: wide("view-terraco", "Terraço com poltronas de fibra sob a pérgola e o mar ao lado"),
  },
  {
    id: "adega",
    name: "Adega",
    note: "Paredes de vidro e centenas de rótulos; visitas com o sommelier",
    bookable: false,
    view: wide("view-adega", "Adega envidraçada com prateleiras iluminadas"),
  },
];

export type MareTable = { id: string; zone: MareZoneId; label: string; seats: number; note?: string };

/**
 * Bookable tables as they appear in the cut-away model.
 * J1–J5: window tables, left to right. R1 back-left, R2 front-left, R3 back-right,
 * R4 front-right (round tables on each side of the communal table). C1: communal table.
 * B1: the chef's counter as one booking. T1 back, T2 front: terrace lounges.
 */
export const MARE_TABLES: MareTable[] = [
  { id: "J1", zone: "janela", label: "Janela 1", seats: 2 },
  { id: "J2", zone: "janela", label: "Janela 2", seats: 2 },
  { id: "J3", zone: "janela", label: "Janela 3", seats: 2, note: "A mais pedida ao pôr do sol" },
  { id: "J4", zone: "janela", label: "Janela 4", seats: 2 },
  { id: "J5", zone: "janela", label: "Janela 5", seats: 2 },
  { id: "R1", zone: "salao", label: "Redonda 1", seats: 4 },
  { id: "R2", zone: "salao", label: "Redonda 2", seats: 4 },
  { id: "R3", zone: "salao", label: "Redonda 3", seats: 4 },
  { id: "R4", zone: "salao", label: "Redonda 4", seats: 4 },
  { id: "C1", zone: "salao", label: "Mesa comunitária", seats: 10, note: "Grupos e aniversários" },
  { id: "B1", zone: "balcao", label: "Balcão do chef", seats: 6, note: "Menu degustação servido pelo chef" },
  { id: "T1", zone: "terraco", label: "Lounge 1", seats: 4 },
  { id: "T2", zone: "terraco", label: "Lounge 2", seats: 4, note: "Mais perto do mar" },
];

export type MareAllergen = "crustáceos" | "moluscos" | "peixe" | "castanhas" | "leite";

export type MareDish = {
  id: string;
  name: string;
  course: "entrada" | "principal" | "sobremesa";
  text: string;
  price: number;
  tags: string[];
  allergens: MareAllergen[];
  pairing: string;
  image: MareImage;
};

export const MARE_DISHES: MareDish[] = [
  {
    id: "ostras",
    name: "Ostras da costa",
    course: "entrada",
    text: "Seis ostras frescas no gelo, limão e mignonette de cebola roxa.",
    price: 64,
    tags: ["cru", "sem glúten"],
    allergens: ["moluscos"],
    pairing: "Espumante brut nature",
    image: square("dish-ostras", "Seis ostras no gelo com limão e mignonette"),
  },
  {
    id: "crudo",
    name: "Crudo de peixe branco",
    course: "entrada",
    text: "Lâminas de peixe do dia em leite de tigre de caju, pimenta dedo-de-moça e castanha tostada.",
    price: 68,
    tags: ["cru", "sem glúten"],
    allergens: ["peixe", "castanhas"],
    pairing: "Sauvignon blanc da serra",
    image: square("dish-crudo", "Crudo de peixe branco em leite de tigre de caju"),
  },
  {
    id: "polvo",
    name: "Polvo na brasa",
    course: "principal",
    text: "Tentáculo grelhado na lenha, batatas ao murro, óleo de páprica defumada e limão tostado.",
    price: 118,
    tags: ["brasa", "sem glúten"],
    allergens: ["moluscos"],
    pairing: "Alvarinho",
    image: square("dish-polvo", "Tentáculo de polvo grelhado com batatas ao murro e limão tostado"),
  },
  {
    id: "peixe",
    name: "Peixe do dia na brasa",
    course: "principal",
    text: "Filé com pele crocante, farofa de castanha de caju e banana-da-terra grelhada.",
    price: 96,
    tags: ["brasa"],
    allergens: ["peixe", "castanhas"],
    pairing: "Chardonnay sem madeira",
    image: square("dish-peixe", "Filé de peixe grelhado com farofa de castanha e banana-da-terra"),
  },
  {
    id: "camarao",
    name: "Camarões na moqueca",
    course: "principal",
    text: "Camarões grelhados em molho de moqueca com dendê, arroz de coco e coentro.",
    price: 112,
    tags: ["brasa", "sem glúten"],
    allergens: ["crustáceos"],
    pairing: "Rosé seco",
    image: square("dish-camarao", "Camarões em molho de moqueca com arroz de coco"),
  },
  {
    id: "cocada",
    name: "Cocada de forno",
    course: "sobremesa",
    text: "Cocada assada na frigideira de ferro com sorvete de tapioca.",
    price: 38,
    tags: ["forno a lenha", "vegetariano"],
    allergens: ["leite"],
    pairing: "Colheita tardia",
    image: square("dish-cocada", "Cocada assada em frigideira de ferro com sorvete de tapioca"),
  },
];

/** "Nina", the scripted AI maître of the demo (a simulation, not a live model). */
export const MAITRE = {
  name: "Nina",
  role: "maître virtual · IA",
  greeting:
    "Boa noite! Sou a Nina, maître virtual do Maré. Posso sugerir pratos para o seu gosto, reservar a sua mesa ou tirar dúvidas sobre alergias.",
  chips: ["Sugira um jantar para dois", "Tenho alergia a crustáceos", "Quero reservar uma mesa de janela"],
} as const;

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
