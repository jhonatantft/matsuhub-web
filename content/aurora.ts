/**
 * Sample data for the "Aurora Residence" real-estate demo. Everything here is fictional.
 * The images in /public/aurora were AI-generated for this demo: 2688×1520 (16:9) originals
 * plus `-1600` variants for small screens and WebGL textures.
 */

export type AuroraImage = { src: string; small: string; alt: string };

const img = (name: string, alt: string): AuroraImage => ({
  src: `/aurora/${name}.jpg`,
  small: `/aurora/${name}-1600.jpg`,
  alt,
});

export const AURORA = {
  name: "Aurora Residence",
  short: "Aurora",
  developer: "Aurora Imóveis",
  domain: "aurora-imoveis.com.br",
  location: "Praia do Sol · Litoral Sul",
  tagline: "Frente mar, do nascer ao pôr do sol.",
  delivery: "Entrega prevista para dez/2028",
  /** Residential floors visible on the facade (floor 1 = lowest band, 21 = highest). */
  floors: 21,
  unitsPerFloor: 2,
  facts: [
    { value: "21", label: "andares frente mar" },
    { value: "42", label: "residências" },
    { value: "98–127 m²", label: "2 e 3 suítes" },
    { value: "Rooftop", label: "piscina de borda infinita" },
  ],
} as const;

export const AURORA_MEDIA = {
  width: 2688,
  height: 1520,
  /** Three pixel-aligned views of the same tower: wireframe "blueprint", daytime and blue hour. */
  exterior: {
    blueprint: img("exterior-blueprint", "Desenho técnico em linhas verdes do edifício Aurora"),
    day: img("exterior-day", "Edifício Aurora visto do mar em um fim de tarde de céu azul"),
    dusk: img("exterior-dusk", "Edifício Aurora ao anoitecer, com os apartamentos iluminados"),
  },
  /**
   * The tower's residential facade inside the exterior images, as fractions of image
   * width/height (same in all three): `left`/`right` are the ends of the balcony slabs,
   * `top` the underside of the roof slab, `bottom` the top of the podium.
   *
   * `lines` are the 22 slab lines (bottom edge of each balcony fascia) from top to bottom,
   * measured on the 2688×1520 originals: floor n (1 = lowest) spans
   * `lines[floors - n] .. lines[floors - n + 1]`. Use them instead of an equal split — the
   * slabs are ~47 px apart at the top and ~49 px at the bottom (perspective), so equal bands
   * drift by up to 5 px. Verified with the stage's `?floors=1` overlay (components/aurora).
   */
  facade: {
    left: 0.3672,
    right: 0.6328,
    top: 0.1112,
    bottom: 0.7809,
    floors: 21,
    lines: [
      0.1112, 0.1461, 0.177, 0.2079, 0.2395, 0.2711, 0.3026, 0.3336, 0.3651, 0.3974, 0.4289, 0.4599, 0.4914, 0.523,
      0.5553, 0.5875, 0.6197, 0.652, 0.6849, 0.7171, 0.7493, 0.7809,
    ],
  },
  /** Where the eye should stay when an exterior is cropped (object-position), as fractions. */
  exteriorFocus: { x: 0.5, y: 0.47 },
  /** The part of the plan image that must stay visible: the model plus a little navy air around it. */
  planBox: { x0: 0.02, y0: 0.03, x1: 0.985, y1: 0.975 },
  /** Flat background of the plan image: extend it when the plan does not fill its box. */
  planBackground: "#041330",
  plan: img("plan", "Planta em corte 3D da residência de 127 m² com três suítes"),
  aerial: img("aerial", "Vista aérea da orla ao anoitecer"),
} as const;

/**
 * Rooms of the featured residence. `plan` is the hotspot position on the plan image and
 * `focus` the point of the room photo to keep in view when it is cropped (both fractions).
 */
export const AURORA_ROOMS = [
  {
    id: "living",
    name: "Living & Cozinha",
    note: "58 m² integrados, de frente para o mar",
    image: img("room-living", "Sala de estar integrada à sala de jantar e à cozinha, com portas de vidro para a varanda e o mar ao fundo"),
    plan: { x: 0.48, y: 0.57 },
    short: "Living",
    focus: { x: 0.36, y: 0.56 },
  },
  {
    id: "suite",
    name: "Suíte master",
    note: "Closet e saída direta para a varanda",
    image: img("room-suite", "Suíte master com porta de vidro para a varanda e passagem para o closet"),
    plan: { x: 0.165, y: 0.58 },
    short: "Suíte",
    focus: { x: 0.53, y: 0.52 },
  },
  {
    id: "bath",
    name: "Banho master",
    note: "Travertino, bancada dupla e ducha de teto",
    image: img("room-bath", "Banho da suíte master em travertino, com bancada dupla e box de vidro"),
    plan: { x: 0.21, y: 0.18 },
    short: "Banho",
    focus: { x: 0.53, y: 0.52 },
  },
  {
    id: "varanda",
    name: "Varanda gourmet",
    note: "Churrasqueira e mesa para oito",
    image: img("room-varanda", "Varanda gourmet com churrasqueira, mesa para oito e vista do mar ao pôr do sol"),
    plan: { x: 0.51, y: 0.82 },
    short: "Varanda",
    focus: { x: 0.62, y: 0.5 },
  },
] as const;

export const AURORA_AMENITIES = [
  {
    id: "pool",
    name: "Rooftop com borda infinita",
    text: "Piscina aquecida, lounge com lareira e o pôr do sol inteiro só para os moradores.",
    image: img("pool", "Piscina de borda infinita no rooftop ao anoitecer"),
  },
  {
    id: "lobby",
    name: "Lobby com pé-direito duplo",
    text: "Travertino, jardim interno e concierge 24 horas.",
    image: img("lobby", "Lobby de pé-direito duplo com lustre escultural e jardim interno"),
  },
  {
    id: "varanda",
    name: "Varandas gourmet",
    text: "Toda residência tem churrasqueira e vista livre para o mar.",
    image: img("room-varanda", "Varanda gourmet com churrasqueira e vista do mar"),
  },
] as const;

export const AURORA_TYPES = {
  A: { id: "A", name: "Residência A", area: 127, suites: 3, vagas: 2, face: "Frente mar", basePrice: 1_650_000, perFloor: 14_000 },
  B: { id: "B", name: "Residência B", area: 98, suites: 2, vagas: 2, face: "Vista lateral do mar", basePrice: 1_180_000, perFloor: 10_000 },
} as const;

export type AuroraStatus = "disponível" | "reservada" | "vendida";
export type AuroraUnit = {
  /** e.g. "1801" = 18th floor, residence 01 */
  id: string;
  floor: number;
  type: keyof typeof AURORA_TYPES;
  area: number;
  suites: number;
  vagas: number;
  price: number;
  status: AuroraStatus;
};

/** 42 units, generated deterministically (no randomness, so server and client agree). */
export const AURORA_UNITS: AuroraUnit[] = Array.from({ length: AURORA.floors }, (_, i) => i + 1).flatMap((floor) =>
  (["A", "B"] as const).map((type, n) => {
    const t = AURORA_TYPES[type];
    const status: AuroraStatus =
      (floor * 7 + n * 3) % 5 === 0 ? "vendida" : (floor * 5 + n) % 7 === 0 ? "reservada" : "disponível";
    return {
      id: `${floor}${String(n + 1).padStart(2, "0")}`,
      floor,
      type,
      area: t.area,
      suites: t.suites,
      vagas: t.vagas,
      price: t.basePrice + (floor - 1) * t.perFloor,
      status,
    };
  }),
);

/** The unit every scripted moment points at: 18th floor, 127 m², available. */
export const AURORA_FEATURED = AURORA_UNITS.find((u) => u.id === "1801")!;

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Points of interest over the aerial image (fractions of the image). */
export const AURORA_PLACES = [
  { name: "Aurora Residence", x: 0.3, y: 0.62, time: "você está aqui", main: true },
  { name: "Praia do Sol", x: 0.45, y: 0.78, time: "30 m" },
  { name: "Marina", x: 0.72, y: 0.4, time: "6 min" },
  { name: "Centro gastronômico", x: 0.2, y: 0.45, time: "4 min" },
  { name: "Parque da Mata", x: 0.1, y: 0.25, time: "8 min" },
] as const;

/** "Lia", the scripted AI broker of the demo (a simulation, not a live model). */
export const LIA = {
  name: "Lia",
  role: "corretora virtual · IA",
  greeting: "Oi! Sou a Lia, corretora virtual do Aurora. Posso mostrar as unidades, simular o financiamento ou agendar a sua visita.",
  chips: ["Ver residências de 3 suítes", "Simular financiamento", "Agendar visita"],
  showcase: [
    { from: "lia", text: "Oi! Vi que você gostou da residência 1801. Quer visitar no sábado?" },
    { from: "user", text: "Tem horário às 10h?" },
    { from: "lia", text: "Confirmado: sábado, 10h ✓ Enviei o convite no seu WhatsApp." },
  ],
} as const;

/** pt-BR label for a unit status, as shown on cards. */
export const AURORA_STATUS_LABEL: Record<AuroraStatus, string> = {
  disponível: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
};

/** The type-A (127 m², frente mar) unit of a floor — the one the tower hover card describes. */
export const auroraUnitOnFloor = (floor: number): AuroraUnit =>
  AURORA_UNITS.find((u) => u.floor === floor && u.type === "A") ?? AURORA_FEATURED;

/** Site navigation of the Aurora demo (labels only; the full demo page decides the targets). */
export const AURORA_NAV = ["Residências", "Lazer", "Localização"] as const;

/**
 * Storyboard of the homepage showcase (components/aurora/showcase): MatsuHub's own voice,
 * commenting on the Aurora demo while the visitor scrolls. `at` is where the step starts on
 * the pinned timeline (0..1).
 */
export const AURORA_SHOWCASE_STEPS = [
  {
    id: "blueprint",
    at: 0,
    label: "Do projeto…",
    title: "Tudo começa no traço.",
    text: "Recebemos a planta, o briefing e a ideia. Nada de template: o seu empreendimento é o protagonista.",
    touch: null,
  },
  {
    id: "build",
    at: 0.1,
    label: "…ao prédio pronto",
    title: "O scroll ergue o edifício.",
    text: "Do wireframe ao render final, na mesma tela. Quem visita o site constrói o prédio com o dedo.",
    touch: null,
  },
  {
    id: "dusk",
    at: 0.46,
    label: "Anoitece",
    title: "A luz certa vende a vista.",
    text: "O dia vira blue hour e os apartamentos acendem, um a um. Emoção que foto parada não entrega.",
    touch: null,
  },
  {
    id: "live",
    at: 0.76,
    label: "Sua vez · ao vivo",
    title: "Agora é com você.",
    text: "Passe o mouse pelos andares e clique: a câmera entra no andar, a planta se abre e cada ponto dourado leva a um ambiente. Nada aqui é vídeo — é o site respondendo a você.",
    touch: "Toque num andar: a câmera entra, a planta se abre e cada ponto dourado leva a um ambiente. Nada aqui é vídeo.",
  },
] as const;

/** The same storyboard for the English homepage (only MatsuHub's commentary; Aurora stays Portuguese). */
export const AURORA_SHOWCASE_STEPS_EN: readonly {
  id: (typeof AURORA_SHOWCASE_STEPS)[number]["id"];
  at: number;
  label: string;
  title: string;
  text: string;
  touch: string | null;
}[] = [
  {
    id: "blueprint",
    at: 0,
    label: "From the drawing…",
    title: "It all starts with a sketch.",
    text: "We get the floor plan, the brief and the idea. No templates: your development is the star.",
    touch: null,
  },
  {
    id: "build",
    at: 0.1,
    label: "…to the finished tower",
    title: "Scrolling raises the building.",
    text: "From wireframe to final render on the same screen. Visitors build the tower with their own thumb.",
    touch: null,
  },
  {
    id: "dusk",
    at: 0.46,
    label: "Nightfall",
    title: "The right light sells the view.",
    text: "Day turns to blue hour and the apartments light up one by one. A still photo can't do that.",
    touch: null,
  },
  {
    id: "live",
    at: 0.76,
    label: "Your turn · live",
    title: "Now it's your turn.",
    text: "Hover over the floors and click: the camera flies into the floor, the plan opens and each gold dot leads to a room. None of this is video — it's the site responding to you.",
    touch: "Tap a floor: the camera flies in, the plan opens and each gold dot leads to a room. None of this is video.",
  },
];
