/** Copy and structure for the MatsuHub site (pt-BR). Placeholder business copy — edit freely. */

import { AURORA } from "./aurora";
import { MARE } from "./mare";
import { PULSO } from "./pulso";

export const SITE = {
  name: "MatsuHub",
  tagline: "Software house · Web + IA",
  description:
    "Software house que cria produtos web sob medida e agentes de IA que atendem, vendem e operam o seu negócio.",
  year: 2026,
} as const;

export const NAV = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#demos", label: "Demos" },
  { href: "/#agentes", label: "Agentes" },
  { href: "/#processo", label: "Processo" },
] as const;

export const SERVICES = [
  {
    id: "agentes",
    title: "Agentes de IA",
    text: "Atendem no WhatsApp, qualificam leads, agendam e operam os seus sistemas — com supervisão humana.",
    tags: ["LLMs", "RAG", "Tools", "WhatsApp"],
  },
  {
    id: "webapps",
    title: "Web apps sob medida",
    text: "Plataformas, portais e dashboards rápidos — do MVP à escala.",
    tags: ["Next.js", "TypeScript", "Cloud"],
  },
  {
    id: "sites",
    title: "Sites que convertem",
    text: "Experiências imersivas com 3D e animação que transformam visita em contato.",
    tags: ["3D", "Motion", "SEO"],
  },
  {
    id: "automacao",
    title: "Automação & integrações",
    text: "Conectamos CRM, ERP, pagamento e planilha. O trabalho repetitivo some; o time foca no que importa.",
    tags: ["APIs", "Webhooks", "CRM", "ERP"],
  },
] as const;

/** The live site-demos, in display order. Single source for the demo bar, the closing band and the homepage picker. */
export type DemoId = "imobiliarias" | "restaurantes" | "ecommerce";
export const DEMOS: readonly {
  id: DemoId;
  /** Segment label, e.g. "Imobiliárias". */
  segment: string;
  /** The fictional client brand of the demo. */
  name: string;
  href: string;
  image: { src: string; alt: string };
  /**
   * The looping screen recording on the homepage card (re-record with scripts/record.mjs and
   * scripts/previews/*.js whenever the demo changes). `domain` is the demo's fictional address.
   */
  preview: { src: string; poster: string; domain: string };
  blurb: string;
}[] = [
  {
    id: "imobiliarias",
    segment: "Imobiliárias",
    name: "Aurora Residence",
    href: "/demos/imobiliarias",
    image: { src: "/aurora/exterior-dusk-1600.jpg", alt: "Fachada do edifício Aurora Residence ao anoitecer" },
    preview: { src: "/previews/imobiliarias.mp4", poster: "/previews/imobiliarias.jpg", domain: AURORA.domain },
    blurb: "Tour 3D pelo prédio, plantas, simulador de financiamento e corretora de IA.",
  },
  {
    id: "restaurantes",
    segment: "Restaurantes",
    name: "Maré — fogo & mar",
    href: "/demos/restaurantes",
    image: { src: "/mare/facade-1600.jpg", alt: "Fachada do restaurante Maré à noite" },
    preview: { src: "/previews/restaurantes.mp4", poster: "/previews/restaurantes.jpg", domain: MARE.domain },
    blurb: "Tour pelo salão, cardápio vivo, reserva de mesa e maître virtual de IA.",
  },
  {
    id: "ecommerce",
    segment: "E-commerce",
    name: "Pulso — áudio",
    href: "/demos/ecommerce",
    image: { src: "/pulso/one-1000.jpg", alt: "Fone de ouvido Pulso One" },
    preview: { src: "/previews/ecommerce.mp4", poster: "/previews/ecommerce.jpg", domain: PULSO.domain },
    blurb: "Produto em 3D, busca por intenção, comparador e vendedor de IA.",
  },
];

/** Segments after Aurora. `href` set = the demo is live (a link instead of "em breve"). */
export const SEGMENTS: readonly {
  id: "clinicas" | "restaurantes" | "ecommerce";
  title: string;
  text: string;
  href?: string;
}[] = [
  { id: "clinicas", title: "Clínicas", text: "Agendamento por agente de IA e confirmação automática de consultas." },
  {
    id: "restaurantes",
    title: "Restaurantes",
    text: "Cardápio imersivo, reservas e pedidos direto pelo WhatsApp.",
    href: "/demos/restaurantes",
  },
  {
    id: "ecommerce",
    title: "E-commerce",
    text: "Vendedor virtual que recomenda, tira dúvidas e recupera carrinhos.",
    href: "/demos/ecommerce",
  },
];

export const PROCESS = [
  { n: "01", title: "Descoberta", text: "Entendemos o negócio, o usuário e onde a IA gera resultado." },
  { n: "02", title: "Protótipo", text: "Um protótipo navegável em dias, para validar antes de investir." },
  { n: "03", title: "Construção", text: "Sprints curtos, deploy contínuo e você acompanhando tudo." },
  { n: "04", title: "Evolução", text: "Monitoramos, medimos e evoluímos o produto e os agentes." },
] as const;

export const MARQUEE = [
  "Agentes de IA",
  "Web apps",
  "Automação",
  "RAG",
  "WhatsApp",
  "Dashboards",
  "Integrações",
  "3D + motion",
] as const;
