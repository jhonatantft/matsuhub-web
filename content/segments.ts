/**
 * Copy for the segment landing pages (/solucoes/<slug> and /en/solutions/<slug>), in both languages.
 * Every user-facing string is a { pt, en } pair (`Localized<T>`); components read them with
 * `t(value, lang)`. Language-neutral data (ids, demo anchors, icons, image paths) sits next to the
 * pairs. Everything described here must match what the demos really do — no statistics, logos,
 * testimonials, prices or guarantees.
 */

import { HOME_PATH, sectionHref } from "@/lib/i18n/sections";
import type { Lang, Localized } from "@/lib/i18n/core";
import { AURORA } from "./aurora";
import { ELO } from "./clinica";
import { CUSTOM_SLUG } from "./custom";
import { MARE } from "./mare";
import { PULSO } from "./pulso";
import { PROCESS } from "./site";

export { fill, t, type Lang, type Localized } from "@/lib/i18n/core";
type L = Localized<string>;

export type SegmentId = "imobiliarias" | "restaurantes" | "ecommerce" | "clinicas";

/** Icon names shared with components/home/parts-b/icons (ToolIcon). */
export type SegmentIcon = "chat" | "crm" | "calendar" | "book" | "card" | "building" | "box" | "truck" | "person" | "clipboard" | "swap" | "bell";

export type SegmentFeature = {
  /** Where to try it in the demo: "#section" on the demo page, or "" for the top. */
  anchor: string;
  title: L;
  text: L;
  /** The action to take in the demo, shown as the "veja no demo" link text. */
  try: L;
};

export type ChatLine = { kind: "in" | "out" | "tool"; text: L };

export type Segment = {
  id: SegmentId;
  /** URL slug per language: /solucoes/<pt> and /en/solutions/<en>. */
  slug: Localized<string>;
  demo: {
    /** The demo route (the demos are Portuguese-only). */
    href: string;
    /** The fictional client brand of the demo. */
    brand: string;
    /** Its fictional address, shown in the browser strip of the preview. */
    domain: string;
    /** The demo's AI agent name. */
    agent: string;
  };
  /**
   * Looping screen recording + poster (public/previews). Pages check that the files exist; while
   * the poster is missing they show `fallback` (a still of the demo), else a branded panel.
   */
  preview: { video: string; poster: string; fallback?: string };
  /** A still from the demo for the highlighted feature card (checked too). `contain` = show it whole (square photos) over this CSS background. */
  still: { src: string; alt: L; contain?: string };
  name: L;
  /** Who the page is for, e.g. "Site para imobiliárias e incorporadoras" (top line of the h1). */
  audience: L;
  /** One line under the segment name in the nav dropdown and the footer. */
  nav: L;
  /** One line on the /solucoes index card. */
  card: L;
  meta: { title: L; description: L; /** Name of the Service in JSON-LD. */ service: L; /** Audience type in JSON-LD. */ audienceType: L };
  hero: { title: L; accent: L; sub: L; chips: L[] };
  pains: { title: L; lead: L; items: { title: L; text: L }[] };
  /** 6 items; the first is the highlighted one, shown with `still`. */
  features: { title: L; lead: L; items: SegmentFeature[] };
  agent: {
    role: L;
    title: L;
    lead: L;
    does: L[];
    never: L[];
    chat: { time: string; channel: L; lines: ChatLine[] };
  };
  integrations: { lead: L; items: { icon: SegmentIcon; title: L; text: L }[] };
  faq: { q: L; a: L }[];
  cta: { title: L; sub: L };
};

/* ───────────── Shared FAQ answers (same promise on every page) ───────────── */

const costQ: L = { pt: "Quanto custa?", en: "How much does it cost?" };
const costA: L = {
  pt: "Depende do escopo. Você recebe a proposta depois da primeira conversa, com o que entra agora, o que pode ficar para depois e o prazo de cada parte.",
  en: "It depends on the scope. You get a proposal after our first conversation, with what's included now, what can wait and the timeline for each part.",
};
const timeQ: L = { pt: "Em quanto tempo fica pronto?", en: "How long does it take?" };

/* ───────────── Segments ───────────── */

export const SEGMENT_LIST: readonly Segment[] = [
  {
    id: "imobiliarias",
    slug: { pt: "imobiliarias", en: "real-estate" },
    demo: { href: "/demos/imobiliarias", brand: AURORA.name, domain: AURORA.domain, agent: "Lia" },
    preview: { video: "/previews/imobiliarias.mp4", poster: "/previews/imobiliarias.jpg" },
    still: {
      src: "/aurora/exterior-dusk-1600.jpg",
      alt: { pt: "O edifício do demo Aurora Residence ao anoitecer, com os apartamentos acesos", en: "The Aurora Residence demo tower at dusk, with its apartments lit" },
    },
    name: { pt: "Imobiliárias", en: "Real estate" },
    audience: { pt: "Site para imobiliárias e incorporadoras", en: "Websites for real estate developers and agencies" },
    nav: { pt: "Tour 3D do prédio, simulador e corretora de IA", en: "3D building tour, mortgage simulator and an AI broker" },
    card: {
      pt: "Mostre o empreendimento antes da obra e atenda o lead na hora em que ele chega.",
      en: "Show the development before it's built, and answer every lead the moment it arrives.",
    },
    meta: {
      title: { pt: "Site para imobiliárias com tour 3D e corretor de IA — MatsuHub", en: "Real estate websites with a 3D tour and an AI broker — MatsuHub" },
      description: {
        pt: "Site para imobiliárias e incorporadoras com tour 3D pelo prédio, plantas, simulador de financiamento e um corretor de IA que agenda visitas a qualquer hora.",
        en: "Websites for real estate developers: a 3D building tour, interactive floor plans, a mortgage simulator and an AI broker that books viewings around the clock.",
      },
      service: { pt: "Site com tour 3D e corretor de IA para imobiliárias", en: "Real estate website with a 3D tour and an AI broker" },
      audienceType: { pt: "Imobiliárias e incorporadoras", en: "Real estate agencies and developers" },
    },
    hero: {
      title: { pt: "Mostre o prédio antes de ele existir.", en: "Show the building before it exists." },
      accent: { pt: "E responda o lead das 23h.", en: "And answer the 11 pm lead." },
      sub: {
        pt: "Tour 3D, plantas, simulador de financiamento e uma corretora de IA que atende na hora e marca a visita.",
        en: "A 3D tour, floor plans, a mortgage simulator and an AI broker that replies instantly and books the viewing.",
      },
      chips: [
        { pt: "Tour 3D do empreendimento", en: "3D development tour" },
        { pt: "Simulador de financiamento", en: "Mortgage simulator" },
        { pt: "Corretora de IA 24 h", en: "24/7 AI broker" },
      ],
    },
    pains: {
      title: { pt: "Planta em PDF não vende apartamento na planta.", en: "A PDF floor plan won't sell an off-plan home." },
      lead: {
        pt: "Quem compra na planta precisa imaginar o que ainda não existe — e quase sempre pergunta fora do horário comercial.",
        en: "Off-plan buyers have to picture something that doesn't exist yet — and they usually ask after business hours.",
      },
      items: [
        {
          title: { pt: "O comprador não consegue imaginar", en: "Buyers can't picture it" },
          text: {
            pt: "Render solto e PDF de planta não mostram qual andar, qual vista, quantos metros. A dúvida vira silêncio.",
            en: "Loose renders and PDF plans don't show which floor, which view, how many square meters. Doubt turns into silence.",
          },
        },
        {
          title: { pt: "O lead chega à noite e esfria até de manhã", en: "Leads arrive at night and go cold by morning" },
          text: {
            pt: "A pessoa pesquisa depois do jantar. Quando o plantão responde, ela já falou com outra imobiliária.",
            en: "People browse after dinner. By the time someone replies, they've already talked to another agency.",
          },
        },
        {
          title: { pt: "O corretor repete a mesma resposta o dia todo", en: "Brokers repeat the same answers all day" },
          text: {
            pt: "Metragem, vagas, entrega, entrada, parcela. Pergunta repetida toma o tempo de quem devia estar negociando.",
            en: "Size, parking, handover date, down payment. Repeat questions eat the time that should go into closing.",
          },
        },
        {
          title: { pt: "A tabela de unidades nunca está em dia", en: "The unit list is never up to date" },
          text: {
            pt: "A 1801 foi vendida, mas o site e o material ainda dizem disponível. O cliente descobre na visita.",
            en: "Unit 1801 sold, but the site and the brochure still say available. The buyer finds out at the viewing.",
          },
        },
      ],
    },
    features: {
      title: { pt: "Um site que o comprador explora — e que faz o plantão da noite.", en: "A site buyers explore — that works the night shift for you." },
      lead: {
        pt: "Tudo abaixo está funcionando no demo Aurora Residence, um lançamento fictício. Abra e teste.",
        en: "Everything below runs in the Aurora Residence demo, a fictional launch. Open it and try.",
      },
      items: [
        {
          anchor: "",
          title: { pt: "Tour pelo prédio", en: "Building tour" },
          text: {
            pt: "Passe o mouse pelos andares: cada um acende com metragem e status. Clique, a câmera entra no andar e a planta em corte se abre.",
            en: "Hover over the floors: each lights up with its size and status. Click, and the camera moves in as the cut-away plan opens.",
          },
          try: { pt: "passe o mouse pelos andares", en: "hover over the floors" },
        },
        {
          anchor: "#plantas",
          title: { pt: "Plantas que levam aos ambientes", en: "Floor plans that open into rooms" },
          text: {
            pt: "Pontos na planta abrem a foto de cada cômodo: living, suíte, banho e varanda.",
            en: "Hotspots on the plan open a photo of each room: living area, suite, bathroom and balcony.",
          },
          try: { pt: "toque nos pontos da planta", en: "tap the hotspots on the plan" },
        },
        {
          anchor: "#residencias",
          title: { pt: "Unidades com status", en: "Units with live status" },
          text: {
            pt: "Filtre por andar e suítes e veja na hora o que está disponível, reservado ou vendido.",
            en: "Filter by floor and bedrooms and see right away what's available, reserved or sold.",
          },
          try: { pt: "filtre as residências", en: "filter the residences" },
        },
        {
          anchor: "#financiamento",
          title: { pt: "Simulador de financiamento", en: "Mortgage simulator" },
          text: {
            pt: "Valor, entrada, prazo e taxa: a parcela muda enquanto o comprador ajusta, pela tabela Price.",
            en: "Price, down payment, term and rate: the monthly payment updates as the buyer adjusts, with fixed-payment amortization.",
          },
          try: { pt: "mexa na entrada e no prazo", en: "change the down payment and term" },
        },
        {
          anchor: "#visita",
          title: { pt: "Visita pedida pelo site", en: "Viewings requested on the site" },
          text: {
            pt: "O comprador escolhe a unidade de interesse e pede a visita ao decorado. O pedido chega com contexto, não só um telefone.",
            en: "Buyers pick the unit they like and ask to see the show flat. The request arrives with context, not just a phone number.",
          },
          try: { pt: "peça uma visita", en: "request a viewing" },
        },
        {
          anchor: "#localizacao",
          title: { pt: "O entorno no mapa", en: "The neighborhood on a map" },
          text: {
            pt: "Vista aérea com o que fica por perto e quanto tempo leva até cada lugar: praia, marina, restaurantes, parque.",
            en: "An aerial view of what's nearby and how long it takes to get there: beach, marina, restaurants, park.",
          },
          try: { pt: "veja o entorno", en: "explore the area" },
        },
      ],
    },
    agent: {
      role: { pt: "corretora de IA", en: "AI broker" },
      title: { pt: "Uma corretora que atende às 23h — e marca a visita.", en: "A broker who picks up at 11 pm — and books the viewing." },
      lead: {
        pt: "Ela conhece cada unidade, simula o financiamento e coloca a visita na agenda do plantão. No demo, ela se chama Lia.",
        en: "She knows every unit, runs the mortgage numbers and puts the viewing on the sales team's calendar. In the demo, her name is Lia.",
      },
      does: [
        { pt: "Responde metragem, vagas, entrega e condições com os dados do empreendimento", en: "Answers size, parking, handover and terms from the development's own data" },
        { pt: "Simula a parcela com a entrada e o prazo que o cliente informa", en: "Runs the payment simulation with the buyer's own down payment and term" },
        { pt: "Agenda a visita e confirma pelo WhatsApp", en: "Books the viewing and confirms it on WhatsApp" },
        { pt: "Registra o lead no CRM com a unidade de interesse e a conversa", en: "Logs the lead in your CRM with the unit of interest and the conversation" },
      ],
      never: [
        { pt: "Não promete desconto, condição ou prazo fora das regras da incorporadora", en: "Never promises discounts, terms or dates outside the developer's rules" },
        { pt: "Não fecha negócio: proposta e contrato ficam com o corretor", en: "Never closes the deal: offers and contracts stay with a human broker" },
        { pt: "Não mostra unidade vendida como disponível — lê o status atualizado", en: "Never shows a sold unit as available — it reads the current status" },
      ],
      chat: {
        time: "23:14",
        channel: { pt: "WhatsApp", en: "WhatsApp" },
        lines: [
          { kind: "in", text: { pt: "Oi! Ainda tem o de 3 suítes? Queria andar alto, de frente pro mar.", en: "Hi! Any 3-suite units left? I'd like a high floor facing the sea." } },
          { kind: "tool", text: { pt: "consultou o estoque · 3 suítes · frente mar", en: "checked inventory · 3 suites · sea-facing" } },
          {
            kind: "out",
            text: {
              pt: "Tem sim! A 1801 fica no 18º andar: 127 m², 3 suítes e vista frontal para o mar. Quer que eu simule a parcela?",
              en: "Yes! Unit 1801 is on the 18th floor: 127 m², 3 suites, facing the sea. Want me to work out the monthly payment?",
            },
          },
          { kind: "in", text: { pt: "Quero. Dou uns 300 mil de entrada.", en: "Sure. I can put about 300k down." } },
          { kind: "tool", text: { pt: "simulou o financiamento · entrada R$ 300 mil · 360 meses", en: "ran the simulation · R$ 300k down · 360 months" } },
          {
            kind: "out",
            text: {
              pt: "Mandei a simulação aqui embaixo, com a parcela e o total. Quer conhecer o decorado? Sábado às 10h está livre.",
              en: "The simulation is below, with the monthly payment and the total. Want to see the show flat? Saturday at 10 am is open.",
            },
          },
          { kind: "in", text: { pt: "Fechado, sábado 10h.", en: "Saturday at 10 works." } },
          { kind: "tool", text: { pt: "visita na agenda · sáb 10h · lead no CRM", en: "viewing booked · Sat 10 am · lead in CRM" } },
          {
            kind: "out",
            text: {
              pt: "Confirmado ✓ Te mando um lembrete na sexta. Um corretor do plantão vai te receber.",
              en: "Confirmed ✓ I'll send you a reminder on Friday. One of our brokers will meet you there.",
            },
          },
        ],
      },
    },
    integrations: {
      lead: {
        pt: "O site e a corretora de IA conversam com os sistemas do comercial — o lead não se perde entre ferramentas.",
        en: "The site and the AI broker talk to your sales systems — leads don't fall between tools.",
      },
      items: [
        { icon: "crm", title: { pt: "CRM imobiliário", en: "Real estate CRM" }, text: { pt: "Cada lead com origem, unidade de interesse e a conversa inteira.", en: "Each lead with its source, unit of interest and the whole conversation." } },
        { icon: "building", title: { pt: "Portais imobiliários", en: "Property portals" }, text: { pt: "Contatos que chegam dos portais entram no mesmo fluxo de atendimento.", en: "Inquiries from listing portals flow into the same pipeline." } },
        { icon: "chat", title: { pt: "WhatsApp", en: "WhatsApp" }, text: { pt: "Atendimento, confirmação e lembrete de visita onde o cliente já conversa.", en: "Replies, confirmations and viewing reminders where buyers already chat." } },
        { icon: "calendar", title: { pt: "Agenda do plantão", en: "Sales team calendar" }, text: { pt: "Visitas marcadas direto nos horários livres dos corretores.", en: "Viewings land straight in the brokers' free slots." } },
        { icon: "clipboard", title: { pt: "Espelho de vendas", en: "Sales inventory" }, text: { pt: "O status de cada unidade sempre igual ao do comercial.", en: "Each unit's status always matches the sales team's." } },
        { icon: "swap", title: { pt: "ERP e planilhas", en: "ERP and spreadsheets" }, text: { pt: "Preços, tabelas e condições vindos de onde você já mantém.", en: "Prices, payment tables and terms pulled from where you already keep them." } },
      ],
    },
    faq: [
      {
        q: timeQ,
        a: {
          pt: "Um protótipo navegável sai em dias, já com a cara do seu empreendimento. O prazo do projeto completo sai na Descoberta, depois que entendemos o escopo: torres, plantas, imagens e integrações.",
          en: "You get a clickable prototype in days, already looking like your development. The timeline for the full project comes out of Discovery, once we understand the scope: towers, floor plans, imagery and integrations.",
        },
      },
      { q: costQ, a: costA },
      {
        q: { pt: "Preciso ter maquete 3D ou renders prontos?", en: "Do I need a 3D model or finished renders?" },
        a: {
          pt: "Ajuda, mas não é obrigatório. Partimos do que existe — projeto, plantas, renders, fotos do decorado — e combinamos na Descoberta como produzir o que falta.",
          en: "It helps, but it isn't required. We start from what you have — architectural drawings, floor plans, renders, show-flat photos — and agree in Discovery on how to produce what's missing.",
        },
      },
      {
        q: { pt: "Funciona com o meu CRM e com os portais?", en: "Does it work with my CRM and the listing portals?" },
        a: {
          pt: "A integração é feita para os sistemas que você usa. Na Descoberta mapeamos cada um e o que precisa passar entre eles; se algum não permitir integração, você fica sabendo antes de começarmos.",
          en: "Integrations are built for the systems you actually use. In Discovery we map each one and what needs to flow between them; if one can't be connected, you'll know before we start.",
        },
      },
      {
        q: { pt: "A corretora de IA pode errar?", en: "Can the AI broker get things wrong?" },
        a: {
          pt: "Pode, como qualquer pessoa. Por isso ela responde a partir dos dados do empreendimento, segue regras sobre o que pode prometer e passa a conversa para um corretor quando sai do roteiro. As conversas ficam registradas e ajustamos o agente nos ciclos de melhoria.",
          en: "It can, like anyone. That's why it answers from your development's data, follows rules on what it may promise and hands the conversation to a broker when it goes off-script. Conversations are logged, and we tune the agent in every improvement cycle.",
        },
      },
      {
        q: { pt: "Quem mantém o site depois do lançamento?", en: "Who maintains the site after launch?" },
        a: {
          pt: "A gente pode manter: depois do lançamento o site entra na fase de Evolução, com melhorias publicadas aos poucos. O que muda todo dia, como status e preço das unidades, pode vir direto dos seus sistemas — sem esperar por nós.",
          en: "We can: after launch the site moves into Evolution, with improvements shipped in small steps. What changes every day, like unit status and prices, can come straight from your own systems — no waiting on us.",
        },
      },
    ],
    cta: {
      title: { pt: "Vamos tirar o seu empreendimento do PDF?", en: "Ready to take your development out of the PDF?" },
      sub: {
        pt: "Conte sobre o lançamento. Voltamos com um plano e um protótipo navegável — para você ver funcionando antes de investir.",
        en: "Tell us about the launch. We'll come back with a plan and a clickable prototype — so you see it working before you invest.",
      },
    },
  },

  {
    id: "restaurantes",
    slug: { pt: "restaurantes", en: "restaurants" },
    demo: { href: "/demos/restaurantes", brand: MARE.name, domain: MARE.domain, agent: "Nina" },
    preview: { video: "/previews/restaurantes.mp4", poster: "/previews/restaurantes.jpg" },
    still: {
      src: "/mare/salon-1600.jpg",
      alt: {
        pt: "O salão do restaurante do demo Maré em corte, visto de cima: bar, cozinha aberta, mesas, adega e terraço",
        en: "A cut-away of the Maré demo restaurant seen from above: bar, open kitchen, tables, wine cellar and terrace",
      },
    },
    name: { pt: "Restaurantes", en: "Restaurants" },
    audience: { pt: "Site para restaurantes", en: "Websites for restaurants" },
    nav: { pt: "Tour pelo salão, cardápio vivo e reservas com IA", en: "Dining room tour, living menu and AI bookings" },
    card: {
      pt: "Deixe o cliente escolher a mesa pela vista, conhecer o cardápio e reservar sem ligar.",
      en: "Let guests pick a table by its view, explore the menu and book without calling.",
    },
    meta: {
      title: { pt: "Site para restaurantes com reserva de mesa e maître de IA — MatsuHub", en: "Restaurant websites with table booking and an AI maître d' — MatsuHub" },
      description: {
        pt: "Site para restaurantes com tour pelo salão, mesa escolhida pela vista, cardápio com ingredientes e alergênicos, reservas e uma maître de IA que atende a qualquer hora.",
        en: "Restaurant websites with a dining-room tour, tables chosen by their view, a menu with ingredients and allergens, bookings and an AI maître d' that answers any time.",
      },
      service: { pt: "Site com reserva de mesa e maître de IA para restaurantes", en: "Restaurant website with table booking and an AI maître d'" },
      audienceType: { pt: "Restaurantes, bares e casas de eventos", en: "Restaurants, bars and event venues" },
    },
    hero: {
      title: { pt: "O cliente escolhe a mesa pela vista.", en: "Guests pick their table by the view." },
      accent: { pt: "E reserva sem ligar.", en: "And book without calling." },
      sub: {
        pt: "Tour pelo salão, cardápio com ingredientes e alergênicos e uma maître de IA que reserva, sugere e avisa a cozinha.",
        en: "A dining-room tour, a menu with ingredients and allergens, and an AI maître d' that books, recommends and briefs the kitchen.",
      },
      chips: [
        { pt: "Tour pelo salão", en: "Dining room tour" },
        { pt: "Cardápio com alergênicos", en: "Allergen-aware menu" },
        { pt: "Maître de IA", en: "AI maître d'" },
      ],
    },
    pains: {
      title: { pt: "O telefone toca no meio do serviço.", en: "The phone rings in the middle of service." },
      lead: {
        pt: "Restaurante vive de casa cheia, mas o caminho até a mesa ainda passa por foto velha, cardápio em PDF e ligação.",
        en: "A restaurant lives on a full house, but the road to the table still runs through old photos, a PDF menu and a phone call.",
      },
      items: [
        {
          title: { pt: "Reserva por telefone na hora do pico", en: "Phone bookings at peak hour" },
          text: {
            pt: "Quem atende está no salão. A ligação cai, o recado se perde, a mesa fica vazia.",
            en: "Whoever picks up is on the floor. The call drops, the note gets lost, the table sits empty.",
          },
        },
        {
          title: { pt: "Cardápio em PDF que ninguém lê no celular", en: "A PDF menu nobody reads on a phone" },
          text: {
            pt: "Pinça, rola, preço desatualizado. O cliente desiste antes de escolher.",
            en: "Pinch, scroll, outdated prices. Guests give up before they choose.",
          },
        },
        {
          title: { pt: "A mesma pergunta sobre alergia, toda noite", en: "The same allergy question every night" },
          text: {
            pt: "Tem crustáceo? Leva castanha? A resposta depende de quem está no turno.",
            en: "Any shellfish? Nuts? The answer depends on who's on shift.",
          },
        },
        {
          title: { pt: "A foto não mostra onde você vai sentar", en: "Photos don't show where you'll sit" },
          text: {
            pt: "O cliente queria a janela no pôr do sol e só descobre na chegada que ficou perto da porta.",
            en: "The guest wanted the window at sunset and finds out on arrival they're by the door.",
          },
        },
      ],
    },
    features: {
      title: { pt: "Um site em que o cliente já entra no salão.", en: "A site where guests walk into the room before they arrive." },
      lead: {
        pt: "Tudo abaixo funciona no demo do Maré, um restaurante fictício de brasa e mar. Abra e teste.",
        en: "Everything below works in the demo of Maré, a fictional wood-fire seafood restaurant. Open it and try.",
      },
      items: [
        {
          anchor: "#salao",
          title: { pt: "Tour pelo salão", en: "Dining room tour" },
          text: {
            pt: "Da porta para dentro: o salão em corte mostra mesas de janela, balcão do chef, bar, terraço e adega, cada área com o seu clima.",
            en: "From the front door inward: a cut-away of the room shows the window tables, chef's counter, bar, terrace and wine cellar, each with its own mood.",
          },
          try: { pt: "clique na porta para entrar", en: "click the door to walk in" },
        },
        {
          anchor: "#salao",
          title: { pt: "Mesa escolhida pela vista", en: "Tables chosen by their view" },
          text: {
            pt: "Escolha quantas pessoas e o horário, passe o cursor nas mesas e veja a vista de cada uma antes de reservar.",
            en: "Pick the party size and time, hover over the tables and see the view from each one before booking.",
          },
          try: { pt: "passe o cursor nas mesas", en: "hover over the tables" },
        },
        {
          anchor: "#cardapio",
          title: { pt: "Cardápio vivo", en: "A living menu" },
          text: {
            pt: "Passe o cursor num prato e veja o que vai nele. Abra para ver detalhes, alergênicos e a harmonização.",
            en: "Hover over a dish to see what's in it. Open it for details, allergens and the wine pairing.",
          },
          try: { pt: "passe o cursor nos pratos", en: "hover over the dishes" },
        },
        {
          anchor: "#cardapio",
          title: { pt: "Filtro de alergênicos", en: "Allergen filter" },
          text: {
            pt: "Marque o que precisa evitar e o cardápio mostra na hora o que dá para pedir.",
            en: "Tick what you need to avoid and the menu shows right away what you can order.",
          },
          try: { pt: "marque um alergênico", en: "tick an allergen" },
        },
        {
          anchor: "#comanda",
          title: { pt: "Comanda antes de chegar", en: "A tab before you arrive" },
          text: {
            pt: "O cliente monta o jantar pelo site: a comanda soma os pratos e pode seguir para a maître de IA.",
            en: "Guests plan dinner on the site: the tab adds up the dishes and can be handed to the AI maître d'.",
          },
          try: { pt: "adicione um prato à comanda", en: "add a dish to the tab" },
        },
        {
          anchor: "#reservas",
          title: { pt: "Reserva sem ligação", en: "Bookings without a call" },
          text: {
            pt: "Data, pessoas, horário e mesa num formulário curto. A equipe confirma pelo WhatsApp.",
            en: "Date, party size, time and table in one short form. The team confirms on WhatsApp.",
          },
          try: { pt: "faça uma reserva", en: "make a booking" },
        },
      ],
    },
    agent: {
      role: { pt: "maître de IA", en: "AI maître d'" },
      title: { pt: "Uma maître que atende enquanto a casa está cheia.", en: "A maître d' who answers while the house is full." },
      lead: {
        pt: "Ela sugere pratos, reserva a mesa e anota a alergia para a cozinha — sem tirar ninguém do salão. No demo, ela se chama Nina.",
        en: "She suggests dishes, books the table and passes allergies to the kitchen — without pulling anyone off the floor. In the demo, her name is Nina.",
      },
      does: [
        { pt: "Reserva por data, horário, número de pessoas e área preferida", en: "Books by date, time, party size and preferred area" },
        { pt: "Sugere pratos e harmonização a partir do cardápio do dia", en: "Suggests dishes and pairings from the day's menu" },
        { pt: "Responde sobre ingredientes e alergênicos com a ficha de cada prato", en: "Answers ingredient and allergen questions from each dish's spec" },
        { pt: "Avisa a equipe sobre aniversário, alergia ou pedido especial", en: "Briefs the team on birthdays, allergies and special requests" },
      ],
      never: [
        {
          pt: "Não garante que um prato está livre de traços — anota a alergia e pede para confirmar com a equipe",
          en: "Never guarantees a dish is trace-free — it notes the allergy and asks the guest to confirm with the team",
        },
        { pt: "Não promete mesa que o sistema não mostra livre", en: "Never promises a table the system doesn't show as free" },
        { pt: "Não oferece desconto ou cortesia por conta própria", en: "Never offers discounts or comps on its own" },
      ],
      chat: {
        time: "18:42",
        channel: { pt: "WhatsApp", en: "WhatsApp" },
        lines: [
          { kind: "in", text: { pt: "Boa noite! Tem mesa pra 4 hoje às 20h? Um de nós é alérgico a camarão.", en: "Hi! Table for 4 tonight at 8? One of us is allergic to shrimp." } },
          { kind: "tool", text: { pt: "consultou as mesas · hoje 20h · 4 pessoas", en: "checked tables · tonight 8 pm · 4 guests" } },
          {
            kind: "out",
            text: {
              pt: "Tenho a Redonda 2, no salão de frente para a brasa, ou o Lounge 1, no terraço. Sobre o camarão: no cardápio de hoje, só a moqueca leva crustáceo.",
              en: "I have Round 2, in the dining room facing the grill, or Lounge 1 on the terrace. About the shrimp: on tonight's menu, only the moqueca has shellfish.",
            },
          },
          { kind: "in", text: { pt: "Terraço!", en: "Terrace, please!" } },
          { kind: "tool", text: { pt: "reserva anotada · Lounge 1 · alergia: crustáceos", en: "booking logged · Lounge 1 · allergy: shellfish" } },
          {
            kind: "out",
            text: {
              pt: "Reservado: hoje, 20h, Lounge 1, para 4. Avisei a cozinha da alergia — confirme com o garçom ao pedir. A confirmação chega aqui.",
              en: "Booked: tonight, 8 pm, Lounge 1, for 4. I've told the kitchen about the allergy — please double-check with your server when ordering. Confirmation is on its way here.",
            },
          },
        ],
      },
    },
    integrations: {
      lead: {
        pt: "Reserva, cardápio e pedido conversam com os sistemas da casa — ninguém redigita nada.",
        en: "Bookings, menu and orders talk to the house systems — nobody retypes anything.",
      },
      items: [
        { icon: "calendar", title: { pt: "Sistema de reservas", en: "Reservation system" }, text: { pt: "Mesas e horários livres de verdade, sem reserva dupla.", en: "Truly free tables and times, no double bookings." } },
        { icon: "chat", title: { pt: "WhatsApp", en: "WhatsApp" }, text: { pt: "Confirmação, lembrete e conversa com a maître onde o cliente está.", en: "Confirmations, reminders and the maître d' chat where guests already are." } },
        { icon: "book", title: { pt: "PDV e ficha técnica", en: "POS and recipe specs" }, text: { pt: "Cardápio, preços e alergênicos vindos da mesma fonte da cozinha.", en: "Menu, prices and allergens from the same source the kitchen uses." } },
        { icon: "truck", title: { pt: "Sistemas de delivery", en: "Delivery platforms" }, text: { pt: "O mesmo cardápio no site e no delivery, sem duas versões.", en: "The same menu on the site and for delivery, no second version." } },
        { icon: "crm", title: { pt: "CRM e lista de clientes", en: "CRM and guest list" }, text: { pt: "Aniversários, preferências e alergias lembrados na próxima visita.", en: "Birthdays, preferences and allergies remembered next time." } },
        { icon: "card", title: { pt: "Gateway de pagamento", en: "Payment gateway" }, text: { pt: "Sinal para eventos e grupos grandes, quando a casa pede.", en: "Deposits for events and large groups, when the house asks for one." } },
      ],
    },
    faq: [
      {
        q: timeQ,
        a: {
          pt: "Um protótipo navegável sai em dias, com o seu salão e o seu cardápio. O prazo do projeto completo sai na Descoberta — depende das áreas da casa, das fotos e das integrações.",
          en: "You get a clickable prototype in days, with your dining room and your menu. The full project timeline comes out of Discovery — it depends on the areas of the house, the photos and the integrations.",
        },
      },
      { q: costQ, a: costA },
      {
        q: { pt: "O cardápio muda toda semana. Como fica?", en: "My menu changes every week. What then?" },
        a: {
          pt: "O cardápio pode vir do sistema da cozinha ou de onde a equipe já atualiza hoje. A ideia é mudar uma vez e aparecer no site, na maître de IA e no delivery.",
          en: "The menu can come from your kitchen system or wherever the team updates it today. The goal: change it once and it shows up on the site, with the AI maître d' and on delivery.",
        },
      },
      {
        q: { pt: "Funciona com o meu sistema de reservas?", en: "Does it work with my reservation system?" },
        a: {
          pt: "A integração é feita para o sistema que você usa. Na Descoberta mapeamos reservas, PDV e canais; se algum não permitir integração, você fica sabendo antes de começarmos e combinamos a alternativa.",
          en: "Integrations are built for the system you use. In Discovery we map reservations, POS and channels; if one can't be connected, you'll know before we start and we'll agree on an alternative.",
        },
      },
      {
        q: { pt: "A maître de IA pode errar?", en: "Can the AI maître d' get things wrong?" },
        a: {
          pt: "Pode. Por isso ela responde com a ficha de cada prato, só oferece mesas que o sistema mostra livres e, quando o assunto é alergia, sempre pede confirmação com a equipe. As conversas ficam registradas e ajustamos o agente a cada ciclo.",
          en: "It can. That's why it answers from each dish's spec, only offers tables the system shows as free and, when allergies come up, always asks the guest to confirm with the team. Conversations are logged and we tune the agent every cycle.",
        },
      },
      {
        q: { pt: "Quem mantém o site depois do lançamento?", en: "Who maintains the site after launch?" },
        a: {
          pt: "A gente pode manter: depois do lançamento o site entra na fase de Evolução, com melhorias publicadas aos poucos. Cardápio, horários e mesas vêm dos seus sistemas, então o dia a dia não depende de nós.",
          en: "We can: after launch the site moves into Evolution, with improvements shipped in small steps. Menu, hours and tables come from your own systems, so day-to-day changes don't depend on us.",
        },
      },
    ],
    cta: {
      title: { pt: "Vamos levar o seu salão para o site?", en: "Shall we put your dining room online?" },
      sub: {
        pt: "Conte como a casa funciona hoje. Voltamos com um plano e um protótipo navegável — para você ver funcionando antes de investir.",
        en: "Tell us how the house runs today. We'll come back with a plan and a clickable prototype — so you see it working before you invest.",
      },
    },
  },

  {
    id: "ecommerce",
    slug: { pt: "ecommerce", en: "ecommerce" },
    demo: { href: "/demos/ecommerce", brand: PULSO.name, domain: PULSO.domain, agent: "Eco" },
    preview: { video: "/previews/ecommerce.mp4", poster: "/previews/ecommerce.jpg" },
    still: {
      src: "/pulso/one-1000.jpg",
      alt: { pt: "O fone Pulso One, produto do demo de e-commerce", en: "The Pulso One headphones, the product in the e-commerce demo" },
      contain: "linear-gradient(90deg, #dddbe6, #d2cfe0)",
    },
    name: { pt: "E-commerce", en: "E-commerce" },
    audience: { pt: "Site para e-commerce e lojas online", en: "Websites for online stores" },
    nav: { pt: "Produto em 3D, busca por intenção e vendedor de IA", en: "3D products, intent search and an AI salesperson" },
    card: {
      pt: "Mostre o produto por dentro, entenda o que o cliente quer e fique visível para agentes de IA.",
      en: "Show the product inside out, understand what shoppers mean and stay visible to AI agents.",
    },
    meta: {
      title: { pt: "Loja online com produto em 3D e vendedor de IA — MatsuHub", en: "Online stores with 3D products and an AI salesperson — MatsuHub" },
      description: {
        pt: "E-commerce sob medida com produto em 3D, busca que entende a intenção, comparador, vendedor de IA e um catálogo pronto para agentes de IA (MCP e UCP).",
        en: "Custom e-commerce with 3D products, search that understands intent, a comparison tool, an AI salesperson and a catalog ready for AI agents (MCP and UCP).",
      },
      service: { pt: "Loja online com produto em 3D e vendedor de IA", en: "Online store with 3D products and an AI salesperson" },
      audienceType: { pt: "Lojas online e marcas com venda direta", en: "Online stores and direct-to-consumer brands" },
    },
    hero: {
      title: { pt: "Uma loja que entende o cliente.", en: "A store that understands shoppers." },
      accent: { pt: "Até quando o cliente é uma IA.", en: "Even when the shopper is an AI." },
      sub: {
        pt: "Produto em 3D que desmonta, busca por intenção, comparador e um vendedor de IA — com o catálogo aberto a assistentes via MCP e UCP.",
        en: "A 3D product that comes apart, intent search, a comparison tool and an AI salesperson — with the catalog open to assistants via MCP and UCP.",
      },
      chips: [
        { pt: "Produto em 3D", en: "3D product view" },
        { pt: "Busca por intenção", en: "Intent search" },
        { pt: "Pronta para MCP e UCP", en: "MCP & UCP ready" },
      ],
    },
    pains: {
      title: { pt: "O cliente sabe o que quer. A busca, não.", en: "Shoppers know what they want. Your search doesn't." },
      lead: {
        pt: "Quem chega à loja pensa no uso — correr, viajar, trabalhar —, mas a vitrine só entende nome de produto e filtro.",
        en: "Shoppers think in uses — running, travel, work — but the storefront only understands product names and filters.",
      },
      items: [
        {
          title: { pt: "A busca só acha o nome exato", en: "Search only matches exact names" },
          text: {
            pt: "“Fone pra correr que aguente chuva” não dá resultado. O cliente fecha a aba.",
            en: "“Running headphones that can take the rain” returns nothing. The shopper closes the tab.",
          },
        },
        {
          title: { pt: "Foto não tira dúvida técnica", en: "Photos don't answer technical questions" },
          text: {
            pt: "Peso, bateria, o que tem por dentro. Sem isso, a dúvida vira devolução ou carrinho abandonado.",
            en: "Weight, battery life, what's inside. Without that, doubt turns into returns or abandoned carts.",
          },
        },
        {
          title: { pt: "Comparar fica por conta do cliente", en: "Comparing is left to the shopper" },
          text: {
            pt: "Duas abas, duas fichas técnicas e nenhuma conclusão. Quem compara sozinho muitas vezes compra em outro lugar.",
            en: "Two tabs, two spec sheets, no verdict. Shoppers who compare alone often buy somewhere else.",
          },
        },
        {
          title: { pt: "Assistentes de IA não enxergam a sua loja", en: "AI assistants can't see your store" },
          text: {
            pt: "Cada vez mais gente pede ao assistente para achar e comprar. Se o catálogo não é legível por máquinas, a loja fica de fora.",
            en: "More and more people ask an assistant to find and buy things. If your catalog isn't machine-readable, your store is left out.",
          },
        },
      ],
    },
    features: {
      title: { pt: "Uma loja que mostra, compara e conversa.", en: "A store that shows, compares and talks." },
      lead: {
        pt: "Tudo abaixo está no demo da Pulso, uma marca fictícia de áudio — inclusive um servidor MCP de verdade.",
        en: "Everything below lives in the demo of Pulso, a fictional audio brand — including a real MCP server.",
      },
      items: [
        {
          anchor: "#one",
          title: { pt: "Produto em 3D que desmonta", en: "A 3D product that comes apart" },
          text: {
            pt: "Gire o fone, troque a cor e abra a vista explodida: arco, conchas, bateria, driver — cada peça com o que ela faz.",
            en: "Spin the headphones, switch colors and open the exploded view: headband, cups, battery, driver — each part with what it does.",
          },
          try: { pt: "abra a vista explodida", en: "open the exploded view" },
        },
        {
          anchor: "#busca",
          title: { pt: "Busca por intenção", en: "Intent search" },
          text: {
            pt: "Escreva do jeito que fala — “fone para correr até R$ 800” — e a loja entende uso, orçamento e requisito.",
            en: "Type the way you talk — “running headphones under R$ 800” — and the store understands use, budget and requirements.",
          },
          try: { pt: "busque do seu jeito", en: "search your own way" },
        },
        {
          anchor: "#comparar",
          title: { pt: "Comparador com veredito", en: "Comparison with a verdict" },
          text: {
            pt: "Lado a lado, com um veredito por uso calculado das fichas técnicas — não da opinião de alguém.",
            en: "Side by side, with a verdict per use calculated from the spec sheets — not from someone's opinion.",
          },
          try: { pt: "compare dois produtos", en: "compare two products" },
        },
        {
          anchor: "#produtos",
          title: { pt: "Carrinho com frete na hora", en: "Cart with shipping up front" },
          text: {
            pt: "Barra até o frete grátis, CEP e prazo antes do checkout. Sem surpresa no último passo.",
            en: "A free-shipping progress bar, postal code and delivery time before checkout. No surprises at the last step.",
          },
          try: { pt: "adicione um produto", en: "add a product" },
        },
        {
          anchor: "#agentes",
          title: { pt: "Pronta para agentes de IA", en: "Ready for AI agents" },
          text: {
            pt: "Um servidor MCP de verdade e um perfil UCP: o assistente do cliente busca, confere estoque, calcula frete e monta o pedido.",
            en: "A real MCP server and a UCP profile: the shopper's assistant searches, checks stock, quotes shipping and builds the order.",
          },
          try: { pt: "veja um agente comprando", en: "watch an agent shop" },
        },
        {
          anchor: "#agentes",
          title: { pt: "Catálogo que os buscadores entendem", en: "A catalog search engines understand" },
          text: {
            pt: "Preço, moeda e disponibilidade de cada produto em dados estruturados, lidos por buscadores e por respostas de IA.",
            en: "Each product's price, currency and availability in structured data, read by search engines and AI answers.",
          },
          try: { pt: "veja os dados estruturados", en: "see the structured data" },
        },
      ],
    },
    agent: {
      role: { pt: "vendedor de IA", en: "AI salesperson" },
      title: { pt: "Um vendedor que conhece cada ficha técnica.", en: "A salesperson who knows every spec sheet." },
      lead: {
        pt: "Ele entende o uso, recomenda pelo catálogo, compara e coloca no carrinho — sem inventar especificação. No demo, ele se chama Eco.",
        en: "He understands the use case, recommends from the catalog, compares and adds to the cart — without making up specs. In the demo, his name is Eco.",
      },
      does: [
        { pt: "Recomenda pelo uso e pelo orçamento, com o estoque real", en: "Recommends by use and budget, from real stock" },
        { pt: "Compara produtos a partir das fichas técnicas", en: "Compares products from their spec sheets" },
        { pt: "Calcula frete e prazo antes do checkout", en: "Quotes shipping and delivery before checkout" },
        { pt: "Monta kits e coloca no carrinho", en: "Builds bundles and adds them to the cart" },
      ],
      never: [
        { pt: "Não inventa especificação, estoque ou prazo — responde com o catálogo", en: "Never makes up specs, stock or delivery times — it answers from the catalog" },
        { pt: "Não cria cupom ou desconto que a loja não autorizou", en: "Never creates coupons or discounts the store hasn't approved" },
        { pt: "Não toca em dados de pagamento: o cliente finaliza no checkout", en: "Never handles payment details: the shopper pays at checkout" },
      ],
      chat: {
        time: "21:08",
        channel: { pt: "chat da loja", en: "store chat" },
        lines: [
          { kind: "in", text: { pt: "Quero um fone pra correr que aguente chuva. Até uns 800.", en: "I need running headphones that can take the rain. Up to about 800." } },
          { kind: "tool", text: { pt: "buscou no catálogo · corrida · à prova d'água · até R$ 800", en: "searched catalog · running · waterproof · up to R$ 800" } },
          {
            kind: "out",
            text: {
              pt: "O Pulso Run foi feito pra isso: ouvido aberto, então você escuta a rua, IP67 e 29 g. Sai por R$ 699 e tem em estoque.",
              en: "Pulso Run is built for that: open-ear, so you still hear traffic, IP67 and 29 g. It's R$ 699 and in stock.",
            },
          },
          { kind: "in", text: { pt: "E o frete?", en: "And shipping?" } },
          { kind: "tool", text: { pt: "calculou o frete · pedido acima de R$ 499", en: "quoted shipping · order over R$ 499" } },
          {
            kind: "out",
            text: {
              pt: "Grátis: pedidos a partir de R$ 499 não pagam entrega. Ele sai em até 3 dias úteis. Coloco no carrinho?",
              en: "Free: orders from R$ 499 ship at no cost. It leaves within 3 business days. Shall I add it to your cart?",
            },
          },
          { kind: "in", text: { pt: "Coloca.", en: "Yes, please." } },
          { kind: "tool", text: { pt: "carrinho · + Pulso Run", en: "cart · + Pulso Run" } },
          { kind: "out", text: { pt: "Pronto ✓ Está no carrinho. É só finalizar no checkout.", en: "Done ✓ It's in your cart. Just check out whenever you're ready." } },
        ],
      },
    },
    integrations: {
      lead: {
        pt: "Catálogo, estoque, frete e pagamento vêm dos sistemas da loja — o site e o vendedor de IA só mostram o que é verdade.",
        en: "Catalog, stock, shipping and payments come from your store's systems — the site and the AI salesperson only show what's true.",
      },
      items: [
        { icon: "box", title: { pt: "Plataforma e ERP", en: "Store platform and ERP" }, text: { pt: "Catálogo, preço e estoque de uma fonte só.", en: "Catalog, price and stock from a single source." } },
        { icon: "card", title: { pt: "Gateway de pagamento", en: "Payment gateway" }, text: { pt: "Checkout seguro, sem o agente tocar no cartão.", en: "Secure checkout, with no agent touching card data." } },
        { icon: "truck", title: { pt: "Frete e transportadoras", en: "Shipping and carriers" }, text: { pt: "Preço e prazo calculados pelo CEP.", en: "Price and delivery time calculated per postal code." } },
        { icon: "crm", title: { pt: "CRM e e-mail", en: "CRM and email" }, text: { pt: "Carrinho abandonado e pós-venda com o contexto da conversa.", en: "Abandoned-cart and after-sales follow-ups with the conversation's context." } },
        { icon: "chat", title: { pt: "WhatsApp", en: "WhatsApp" }, text: { pt: "O vendedor de IA também atende onde o cliente conversa.", en: "The AI salesperson also answers where shoppers chat." } },
        { icon: "swap", title: { pt: "Assistentes de IA", en: "AI assistants" }, text: { pt: "MCP e UCP abrem catálogo e checkout para agentes, com as suas regras.", en: "MCP and UCP open your catalog and checkout to agents, under your rules." } },
      ],
    },
    faq: [
      {
        q: timeQ,
        a: {
          pt: "Um protótipo navegável sai em dias, com produtos de verdade do seu catálogo. O prazo do projeto completo sai na Descoberta — depende do catálogo, dos modelos 3D e das integrações.",
          en: "You get a clickable prototype in days, with real products from your catalog. The full project timeline comes out of Discovery — it depends on the catalog, the 3D models and the integrations.",
        },
      },
      { q: costQ, a: costA },
      {
        q: { pt: "Preciso trocar de plataforma?", en: "Do I need to switch platforms?" },
        a: {
          pt: "Não necessariamente. Dá para construir a vitrine sobre o que você já usa ou começar do zero — decidimos juntos na Descoberta, olhando catálogo, volume e integrações. Se algum sistema não permitir integração, você fica sabendo antes de começarmos.",
          en: "Not necessarily. We can build the storefront on top of what you use today or start fresh — we decide together in Discovery, looking at your catalog, volume and integrations. If a system can't be connected, you'll know before we start.",
        },
      },
      {
        q: { pt: "O que são MCP e UCP, e por que importam?", en: "What are MCP and UCP, and why do they matter?" },
        a: {
          pt: "São protocolos abertos para agentes de IA. O MCP deixa o assistente do cliente consultar catálogo, estoque e frete; o UCP padroniza como ele monta um pedido seguindo as regras da sua loja. No demo, o servidor MCP funciona de verdade.",
          en: "They're open protocols for AI agents. MCP lets a shopper's assistant query your catalog, stock and shipping; UCP standardizes how it builds an order under your store's rules. In the demo, the MCP server actually works.",
        },
      },
      {
        q: { pt: "O vendedor de IA pode errar?", en: "Can the AI salesperson get things wrong?" },
        a: {
          pt: "Pode. Por isso ele responde a partir do catálogo e do estoque, não cria desconto e não toca em pagamento. As conversas ficam registradas e ajustamos o agente nos ciclos de melhoria.",
          en: "It can. That's why it answers from your catalog and stock, never creates discounts and never touches payments. Conversations are logged and we tune the agent in every improvement cycle.",
        },
      },
      {
        q: { pt: "Quem mantém a loja depois do lançamento?", en: "Who maintains the store after launch?" },
        a: {
          pt: "A gente pode manter: depois do lançamento a loja entra na fase de Evolução, com melhorias publicadas aos poucos. Produto, preço e estoque vêm dos seus sistemas — atualizar o catálogo não depende de nós.",
          en: "We can: after launch the store moves into Evolution, with improvements shipped in small steps. Products, prices and stock come from your own systems — updating the catalog doesn't depend on us.",
        },
      },
    ],
    cta: {
      title: { pt: "Vamos abrir a sua loja para pessoas e agentes?", en: "Shall we open your store to people and agents alike?" },
      sub: {
        pt: "Conte sobre o catálogo e a operação. Voltamos com um plano e um protótipo navegável — para você ver funcionando antes de investir.",
        en: "Tell us about your catalog and operation. We'll come back with a plan and a clickable prototype — so you see it working before you invest.",
      },
    },
  },

  {
    id: "clinicas",
    slug: { pt: "clinicas", en: "clinics" },
    demo: { href: "/demos/clinicas", brand: ELO.name, domain: ELO.domain, agent: "Iris" },
    preview: { video: "/previews/clinicas.mp4", poster: "/previews/clinicas.jpg", fallback: "/clinica/facade-1600.jpg" },
    still: {
      src: "/clinica/floor-1600.jpg",
      alt: {
        pt: "A clínica do demo Elo em corte, vista de cima: recepção, sala de espera, quatro consultórios, exames e coleta",
        en: "A cut-away of the Elo demo clinic seen from above: reception, waiting room, four consulting rooms, imaging and lab",
      },
    },
    name: { pt: "Clínicas", en: "Clinics" },
    audience: { pt: "Site para clínicas e consultórios", en: "Websites for clinics and medical practices" },
    nav: { pt: "Tour pela clínica, agenda online e recepcionista de IA", en: "Clinic tour, online booking and an AI receptionist" },
    card: {
      pt: "O paciente vê o horário livre, agenda sozinho e chega com a pré-consulta feita.",
      en: "Patients see open slots, book on their own and arrive with intake done.",
    },
    meta: {
      title: { pt: "Site para clínicas com agendamento online e recepcionista de IA — MatsuHub", en: "Clinic websites with online booking and an AI receptionist — MatsuHub" },
      description: {
        pt: "Site para clínicas e consultórios com tour pela clínica, agendamento com horários reais, pré-consulta e uma recepcionista de IA que nunca dá orientação médica.",
        en: "Websites for clinics and practices: a clinic tour, booking with real availability, online intake and an AI receptionist that never gives medical advice.",
      },
      service: { pt: "Site com agendamento online e recepcionista de IA para clínicas", en: "Clinic website with online booking and an AI receptionist" },
      audienceType: { pt: "Clínicas, consultórios e centros de diagnóstico", en: "Clinics, medical practices and diagnostic centers" },
    },
    hero: {
      title: { pt: "O paciente agenda sozinho, a qualquer hora.", en: "Patients book themselves, any time." },
      accent: { pt: "E a recepção sai do telefone.", en: "And your front desk gets off the phone." },
      sub: {
        pt: "Tour pela clínica, horários reais por especialista, pré-consulta e uma recepcionista de IA que agenda — e nunca dá orientação médica.",
        en: "A clinic tour, real slots per specialist, online intake and an AI receptionist that books — and never gives medical advice.",
      },
      chips: [
        { pt: "Agenda com horários reais", en: "Real-time availability" },
        { pt: "Pré-consulta online", en: "Online intake" },
        { pt: "Recepcionista de IA", en: "AI receptionist" },
      ],
    },
    pains: {
      title: { pt: "A recepção vive no telefone.", en: "Your front desk lives on the phone." },
      lead: {
        pt: "Marcar consulta ainda depende de ligar em horário comercial, esperar na linha e repetir os mesmos dados.",
        en: "Booking still means calling during office hours, waiting on hold and repeating the same details.",
      },
      items: [
        {
          title: { pt: "Agendar só por telefone, em horário comercial", en: "Booking by phone, office hours only" },
          text: {
            pt: "O paciente lembra da consulta à noite. No dia seguinte, esquece de ligar.",
            en: "Patients remember at night. By morning, they forget to call.",
          },
        },
        {
          title: { pt: "Falta sem aviso", en: "No-shows" },
          text: {
            pt: "Sem confirmação nem lembrete, o horário fica vazio — e outro paciente ficou sem vaga.",
            en: "Without confirmations or reminders, the slot sits empty — while someone else couldn't get one.",
          },
        },
        {
          title: { pt: "Ficha preenchida na sala de espera", en: "Forms filled in the waiting room" },
          text: {
            pt: "Prancheta, letra difícil, dado redigitado. A consulta começa atrasada.",
            en: "Clipboards, hard-to-read handwriting, data retyped. The appointment starts late.",
          },
        },
        {
          title: { pt: "Pergunta de saúde no WhatsApp da recepção", en: "Health questions on the front desk's WhatsApp" },
          text: {
            pt: "A recepção não pode orientar, mas também não pode ignorar. Falta um caminho claro — inclusive para emergência.",
            en: "The front desk can't give advice, but can't ignore it either. There's no clear path — emergencies included.",
          },
        },
      ],
    },
    features: {
      title: { pt: "Um site que agenda, prepara e orienta — sem fazer papel de médico.", en: "A site that books, prepares and guides — without playing doctor." },
      lead: {
        pt: "Tudo abaixo está no demo da Elo, uma clínica fictícia. Abra e teste.",
        en: "Everything below is in the demo of Elo, a fictional clinic. Open it and try.",
      },
      items: [
        {
          anchor: "",
          title: { pt: "Tour pela clínica em corte", en: "A cut-away clinic tour" },
          text: {
            pt: "A clínica vista de cima: recepção, sala de espera, consultórios, exames e coleta. Quem nunca foi já chega sabendo onde fica cada coisa.",
            en: "The clinic from above: reception, waiting room, consulting rooms, imaging and lab. First-time patients arrive knowing where everything is.",
          },
          try: { pt: "explore a clínica", en: "explore the clinic" },
        },
        {
          anchor: "",
          title: { pt: "Cada consultório mostra a agenda", en: "Every room shows its schedule" },
          text: {
            pt: "Clique num consultório: aparecem o especialista que atende ali e os próximos horários livres.",
            en: "Click a consulting room: you see the specialist who works there and their next open slots.",
          },
          try: { pt: "clique num consultório", en: "click a consulting room" },
        },
        {
          anchor: "#agendar",
          title: { pt: "Agendamento com a agenda à vista", en: "Booking with the calendar in view" },
          text: {
            pt: "Especialidade, profissional, dia e hora, com os horários livres e ocupados à vista — presencial ou teleconsulta. A confirmação chega pelo WhatsApp.",
            en: "Specialty, practitioner, day and time, with free and taken slots in plain view — in person or by video. The confirmation arrives on WhatsApp.",
          },
          try: { pt: "marque uma consulta", en: "book an appointment" },
        },
        {
          anchor: "#agendar",
          title: { pt: "Convite para a agenda do paciente", en: "An invite for the patient's calendar" },
          text: {
            pt: "Ao confirmar, a consulta vira um arquivo de calendário (.ics) de verdade, junto com o que levar no dia.",
            en: "Once confirmed, the appointment becomes a real calendar file (.ics), along with what to bring on the day.",
          },
          try: { pt: "baixe o convite", en: "download the invite" },
        },
        {
          anchor: "#pre-consulta",
          title: { pt: "Pré-consulta do paciente", en: "Patient intake notes" },
          text: {
            pt: "Motivo, alergias, remédios e perguntas viram um resumo para imprimir ou mostrar no celular. No demo, nada sai do aparelho do paciente.",
            en: "Reason for the visit, allergies, medication and questions become a summary to print or show on a phone. In the demo, nothing leaves the patient's device.",
          },
          try: { pt: "faça a pré-consulta", en: "fill in the intake" },
        },
        {
          anchor: "",
          title: { pt: "Emergência tem caminho claro", en: "A clear path for emergencies" },
          text: {
            pt: "Qualquer sinal de urgência na conversa recebe primeiro a orientação de ligar para o SAMU 192. A recepcionista não faz triagem.",
            en: "Any sign of urgency in the chat first gets the instruction to call SAMU on 192, Brazil's emergency medical line. The receptionist never triages.",
          },
          try: { pt: "escreva “falta de ar” para a Iris", en: "type “falta de ar” (shortness of breath) to Iris" },
        },
      ],
    },
    agent: {
      role: { pt: "recepcionista de IA", en: "AI receptionist" },
      title: { pt: "Uma recepcionista que agenda — e sabe o que não pode responder.", en: "A receptionist who books — and knows what not to answer." },
      lead: {
        pt: "Ela encontra horário, marca, envia a pré-consulta e explica o preparo. Dúvida de saúde vai para o profissional; emergência, para o 192. No demo, ela se chama Iris.",
        en: "She finds a slot, books it, sends the intake form and explains how to prepare. Health questions go to the practitioner; emergencies, to 192. In the demo, her name is Iris.",
      },
      does: [
        { pt: "Encontra horário por especialidade, profissional e período", en: "Finds slots by specialty, practitioner and time of day" },
        { pt: "Agenda, remarca e envia o convite para a agenda do paciente", en: "Books, reschedules and sends the calendar invite" },
        { pt: "Envia a pré-consulta e lembra o paciente antes do horário", en: "Sends the intake form and reminds patients beforehand" },
        { pt: "Explica o preparo de exames e o que levar no dia", en: "Explains exam preparation and what to bring on the day" },
      ],
      never: [
        { pt: "Não dá diagnóstico, não interpreta exame e não indica remédio", en: "Never diagnoses, reads test results or recommends medication" },
        { pt: "Em sinal de emergência, orienta a ligar para o SAMU 192 na hora", en: "At any sign of emergency, tells the patient to call SAMU on 192 right away" },
        { pt: "Não pede mais dados de saúde do que o agendamento precisa", en: "Never asks for more health data than booking requires" },
      ],
      chat: {
        time: "22:31",
        channel: { pt: "WhatsApp", en: "WhatsApp" },
        lines: [
          { kind: "in", text: { pt: "Oi! Queria marcar dermatologista. Tem horário essa semana?", en: "Hi! I'd like to see a dermatologist. Anything this week?" } },
          { kind: "tool", text: { pt: "consultou a agenda · dermatologia · esta semana", en: "checked calendar · dermatology · this week" } },
          {
            kind: "out",
            text: {
              pt: "Tenho com a Dra. Camila Rocha na terça às 9h ou na quinta às 14h30. Qual prefere?",
              en: "Dr. Camila Rocha has Tuesday at 9 am or Thursday at 2:30 pm. Which do you prefer?",
            },
          },
          { kind: "in", text: { pt: "Quinta. Uma pinta minha mudou de cor, é grave?", en: "Thursday. A mole of mine changed color — is it serious?" } },
          {
            kind: "out",
            text: {
              pt: "Isso eu não consigo avaliar — quem responde é a médica, na consulta. Se surgir algo urgente, ligue 192 (SAMU).",
              en: "That's not something I can assess — the doctor will look at it in your appointment. If anything urgent comes up, call 192 (SAMU).",
            },
          },
          { kind: "tool", text: { pt: "consulta marcada · qui 14h30 · convite .ics enviado", en: "booked · Thu 2:30 pm · .ics invite sent" } },
          {
            kind: "out",
            text: {
              pt: "Quinta, 14h30, confirmada ✓ Mandei o convite para a sua agenda e a pré-consulta — conte ali sobre a pinta. Se for no rosto, venha sem maquiagem.",
              en: "Thursday, 2:30 pm, confirmed ✓ I've sent the calendar invite and the intake form — mention the mole there. If it's on your face, please come without makeup.",
            },
          },
        ],
      },
    },
    integrations: {
      lead: {
        pt: "Agenda, prontuário e confirmação ficam ligados — a recepção não redigita nada.",
        en: "Scheduling, records and confirmations stay connected — the front desk retypes nothing.",
      },
      items: [
        { icon: "calendar", title: { pt: "Agenda e sistema de gestão", en: "Scheduling and practice management" }, text: { pt: "Horários reais de cada profissional, sem encaixe duplicado.", en: "Each practitioner's real availability, no double booking." } },
        { icon: "clipboard", title: { pt: "Prontuário eletrônico", en: "Electronic health records" }, text: { pt: "Quando a clínica quiser, a pré-consulta segue para o prontuário, com consentimento e acesso só de quem precisa.", en: "When the clinic wants it, intake notes flow into the patient record, with consent and access only for those who need it." } },
        { icon: "chat", title: { pt: "WhatsApp", en: "WhatsApp" }, text: { pt: "Confirmação, lembrete e remarcação onde o paciente já conversa.", en: "Confirmations, reminders and rescheduling where patients already chat." } },
        { icon: "bell", title: { pt: "Lembretes por e-mail e SMS", en: "Email and SMS reminders" }, text: { pt: "Aviso na véspera, com opção de remarcar.", en: "A heads-up the day before, with an option to reschedule." } },
        { icon: "person", title: { pt: "Convênios", en: "Health plans" }, text: { pt: "Planos aceitos por profissional, à vista antes de o paciente escolher o horário.", en: "Which plans each practitioner accepts, shown before the patient picks a time." } },
        { icon: "card", title: { pt: "Gateway de pagamento", en: "Payment gateway" }, text: { pt: "Consulta particular paga online, se a clínica quiser.", en: "Private-pay visits paid online, if the clinic wants it." } },
      ],
    },
    faq: [
      {
        q: timeQ,
        a: {
          pt: "Um protótipo navegável sai em dias, com as especialidades e os horários da sua clínica. O prazo do projeto completo sai na Descoberta — depende das especialidades, das unidades e das integrações.",
          en: "You get a clickable prototype in days, with your clinic's specialties and hours. The full project timeline comes out of Discovery — it depends on specialties, locations and integrations.",
        },
      },
      { q: costQ, a: costA },
      {
        q: { pt: "E a LGPD?", en: "What about privacy law (LGPD)?" },
        a: {
          pt: "Pela LGPD, dado de saúde é dado sensível, e o projeto já nasce tratando assim: coletamos só o necessário para agendar e preparar a consulta, com consentimento claro, acesso restrito e registro de quem acessou. Onde os dados ficam, por quanto tempo e quem responde por eles definimos com você na Descoberta. No demo, a pré-consulta nem sai do aparelho do paciente.",
          en: "Under Brazil's LGPD, health data is sensitive data, and the project treats it that way from day one: we collect only what's needed to book and prepare the visit, with clear consent, restricted access and a log of who accessed what. Where data lives, for how long and who is responsible for it, we define with you in Discovery. In the demo, intake notes never even leave the patient's device.",
        },
      },
      {
        q: { pt: "Funciona com o meu sistema de agenda e prontuário?", en: "Does it work with my scheduling and records system?" },
        a: {
          pt: "A integração é feita para os sistemas que a clínica usa. Na Descoberta mapeamos agenda, prontuário e canais; se algum não permitir integração, você fica sabendo antes de começarmos.",
          en: "Integrations are built for the systems your clinic uses. In Discovery we map scheduling, records and channels; if one can't be connected, you'll know before we start.",
        },
      },
      {
        q: { pt: "A recepcionista de IA pode errar?", en: "Can the AI receptionist get things wrong?" },
        a: {
          pt: "Pode, como qualquer pessoa. Por isso ela trabalha só com agenda e informação administrativa, nunca responde dúvida clínica, orienta emergências para o SAMU 192 e passa a conversa para a equipe quando sai do roteiro. As conversas ficam registradas e são revisadas nos ciclos de melhoria.",
          en: "It can, like anyone. That's why it only handles scheduling and administrative information, never answers clinical questions, directs emergencies to SAMU on 192 and hands the conversation to your team when it goes off-script. Conversations are logged and reviewed in every improvement cycle.",
        },
      },
      {
        q: { pt: "Quem mantém o site depois do lançamento?", en: "Who maintains the site after launch?" },
        a: {
          pt: "A gente pode manter: depois do lançamento o site entra na fase de Evolução, com melhorias publicadas aos poucos. Agenda e profissionais vêm dos seus sistemas, então o dia a dia não depende de nós.",
          en: "We can: after launch the site moves into Evolution, with improvements shipped in small steps. Schedules and practitioners come from your own systems, so day-to-day changes don't depend on us.",
        },
      },
    ],
    cta: {
      title: { pt: "Vamos tirar a sua agenda do telefone?", en: "Shall we take your schedule off the phone?" },
      sub: {
        pt: "Conte como a clínica agenda hoje. Voltamos com um plano e um protótipo navegável — para você ver funcionando antes de investir.",
        en: "Tell us how your clinic books today. We'll come back with a plan and a clickable prototype — so you see it working before you invest.",
      },
    },
  },
];

export const SEGMENT_IDS = SEGMENT_LIST.map((segment) => segment.id);
export const segmentById = (id: SegmentId): Segment => SEGMENT_LIST.find((segment) => segment.id === id)!;
export const segmentBySlug = (slug: string, lang: Lang): Segment | undefined =>
  SEGMENT_LIST.find((segment) => segment.slug[lang] === slug);

/* ───────────── Shared interface copy ───────────── */

export const SEGMENT_UI = {
  solutions: { pt: "Soluções", en: "Solutions" },
  home: { pt: "Início", en: "Home" },
  ctaPrimary: { pt: "Quero um site assim", en: "I want a site like this" },
  ctaDemo: { pt: "Abrir o demo", en: "Open the demo" },
  breadcrumb: { pt: "Trilha de navegação", en: "Breadcrumb" },
  chipsLabel: { pt: "O que vem no site", en: "What the site includes" },
  preview: {
    live: { pt: "ao vivo · prévia", en: "live · preview" },
    /** Strip label while the frame shows a still instead of the recording. */
    liveStill: { pt: "prévia", en: "preview" },
    play: { pt: "▶ ver prévia", en: "▶ play preview" },
    pause: { pt: "❚❚ pausar", en: "❚❚ pause" },
    playLabel: { pt: "Ver prévia do demo {demo}", en: "Play the {demo} demo preview" },
    pauseLabel: { pt: "Pausar prévia do demo {demo}", en: "Pause the {demo} demo preview" },
    linkLabel: { pt: "Abrir o demo {demo}", en: "Open the {demo} demo" },
    caption: { pt: "Gravação do demo {demo}. Abra para usar de verdade.", en: "A recording of the {demo} demo. Open it to try it for real." },
    /** Used while the demo has no recording yet (the frame shows a still). */
    captionStill: { pt: "Imagem do demo {demo}. Abra para usar de verdade.", en: "A still from the {demo} demo. Open it to try it for real." },
    fallback: { pt: "demo navegável", en: "interactive demo" },
  },
  pains: { label: { pt: "01 — O que trava hoje", en: "01 — What's stuck today" } },
  features: {
    label: { pt: "02 — O que construímos", en: "02 — What we build" },
    tryIn: { pt: "veja no demo", en: "see it in the demo" },
    highlight: { pt: "destaque do demo", en: "demo highlight" },
  },
  agent: {
    label: { pt: "03 — O agente de IA", en: "03 — The AI agent" },
    does: { pt: "O que faz", en: "What it does" },
    never: { pt: "O que nunca faz", en: "What it never does" },
    example: { pt: "exemplo", en: "example" },
    customer: { pt: "Cliente", en: "Customer" },
    chatLabel: { pt: "Exemplo de conversa com {agent}, {role}", en: "Example conversation with {agent}, {role}" },
    note: {
      pt: "Conversa roteirizada para ilustrar. Em produção, o agente opera nos seus sistemas reais e passa para a equipe quando precisa.",
      en: "A scripted conversation for illustration. In production, the agent works inside your real systems and hands over to your team when needed.",
    },
  },
  integrations: {
    label: { pt: "04 — Integrações", en: "04 — Integrations" },
    title: { pt: "Integra com o que você já usa.", en: "Works with what you already use." },
    hub: { pt: "seu site + {role}", en: "your site + {role}" },
    note: {
      pt: "Categorias, não marcas: na Descoberta mapeamos os sistemas que você usa e como cada um se conecta.",
      en: "Categories, not brands: in Discovery we map the systems you use and how each one connects.",
    },
  },
  process: {
    label: { pt: "05 — Como funciona", en: "05 — How it works" },
    title: { pt: "Do primeiro papo ao site no ar.", en: "From first chat to a live site." },
    accent: { pt: "Com você em cada ciclo.", en: "With you in every cycle." },
    lead: PROCESS.lead,
    more: { pt: "Ver o processo completo", en: "See the full process" },
    /** Same phases as the homepage's process section (content/site.ts). */
    phases: PROCESS.phases.map(({ title, short, text }) => ({ title, short, text })),
  },
  faq: {
    label: { pt: "06 — Perguntas frequentes", en: "06 — FAQ" },
    title: { pt: "Perguntas diretas, respostas honestas.", en: "Straight questions, honest answers." },
    lead: {
      pt: "Sem letra miúda: o que dá para prometer agora e o que só sai depois da primeira conversa.",
      en: "No fine print: what we can promise now, and what only comes out of the first conversation.",
    },
  },
  cta: {
    label: { pt: "Próximo passo", en: "Next step" },
    others: { pt: "Outras soluções", en: "Other solutions" },
    all: { pt: "Ver todas as soluções", en: "See all solutions" },
  },
  index: {
    metaTitle: { pt: "Sites e agentes de IA por segmento — MatsuHub", en: "Websites and AI agents by industry — MatsuHub" },
    metaDescription: {
      pt: "Soluções da MatsuHub para imobiliárias, restaurantes, e-commerce e clínicas: sites interativos com um agente de IA integrado, cada um com um demo funcionando.",
      en: "MatsuHub solutions for real estate, restaurants, e-commerce and clinics: interactive websites with a built-in AI agent, each with a working demo.",
    },
    label: { pt: "Soluções por segmento", en: "Solutions by industry" },
    title: { pt: "Cada segmento vende de um jeito.", en: "Every industry sells differently." },
    accent: { pt: "O site também deveria.", en: "Its website should too." },
    sub: {
      pt: "Para cada segmento, um site que o cliente explora e um agente de IA que atende, agenda e vende — com um demo no ar para você testar antes de conversar.",
      en: "For each industry, a site customers explore and an AI agent that answers, books and sells — with a live demo to try before we even talk.",
    },
    listLabel: { pt: "Soluções por segmento", en: "Solutions by industry" },
    open: { pt: "Ver a solução", en: "See the solution" },
    demo: { pt: "demo", en: "demo" },
    agent: { pt: "agente", en: "agent" },
    otherTitle: { pt: "Não está na lista? Melhor ainda.", en: "Not on the list? Even better." },
    otherText: {
      pt: "Estes quatro já têm demo. Fora deles, construímos qualquer software sob medida: plataformas, apps, integrações, dados, cloud e IA.",
      en: "These four already have demos. Beyond them, we build any custom software: platforms, apps, integrations, data, cloud and AI.",
    },
    otherCta: { pt: "Ver software sob medida", en: "See custom software" },
    otherContact: { pt: "Falar sobre o meu negócio", en: "Talk about my business" },
  },
  nav: {
    menu: { pt: "Soluções", en: "Solutions" },
    heading: { pt: "Site + IA por segmento", en: "Website + AI by industry" },
    all: { pt: "Ver todas as soluções", en: "See all solutions" },
    demo: { pt: "Demo ao vivo", en: "Live demo" },
  },
  og: {
    kicker: { pt: "Site + IA para {segment}", en: "Website + AI for {segment}" },
    indexKicker: { pt: "Soluções por segmento", en: "Solutions by industry" },
  },
} as const satisfies Record<string, unknown>;

/* ───────────── Links ───────────── */

/** How the segment components build their links, per language. */
export type SegmentHrefs = {
  /** The homepage of the language. */
  home: string;
  /** The solutions index (/solucoes · /en/solutions). */
  index: string;
  segment: (id: SegmentId) => string;
  /** The custom-builds page (/solucoes/sob-medida · /en/solutions/custom), content/custom.ts. */
  custom: string;
  /** A demo page, optionally at an anchor ("#plantas"). The demos are Portuguese-only. */
  demo: (id: SegmentId, anchor?: string) => string;
  /** The homepage contact form and process section. */
  contact: string;
  process: string;
};

const hrefsFor = (lang: Lang, index: string): SegmentHrefs => ({
  home: HOME_PATH[lang],
  index,
  segment: (id) => `${index}/${segmentById(id).slug[lang]}`,
  custom: `${index}/${CUSTOM_SLUG[lang]}`,
  demo: (id, anchor = "") => `${segmentById(id).demo.href}${anchor}`,
  contact: sectionHref("contact", lang),
  process: sectionHref("process", lang),
});

export const SEGMENT_HREFS_PT: SegmentHrefs = hrefsFor("pt", "/solucoes");
export const SEGMENT_HREFS_EN: SegmentHrefs = hrefsFor("en", "/en/solutions");
export const SEGMENT_HREFS: Localized<SegmentHrefs> = { pt: SEGMENT_HREFS_PT, en: SEGMENT_HREFS_EN };
