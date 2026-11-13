/**
 * Copy and structure for the MatsuHub site, in both languages. Every user-facing string is a
 * { pt, en } pair (`Localized<T>`, read with `t(value, lang)`), the same way content/segments.ts
 * works; ids, hrefs, images and tags are language-neutral. Interface microcopy (buttons, statuses,
 * form messages) lives in lib/i18n/dictionaries.
 */

import type { Localized } from "@/lib/i18n/core";
import type { SectionKey } from "@/lib/i18n/sections";
import { AURORA } from "./aurora";
import { ELO } from "./clinica";
import { MARE } from "./mare";
import { PULSO } from "./pulso";

type L = Localized<string>;

export const SITE = {
  name: "MatsuHub",
  year: 2026,
  tagline: { pt: "Software house · Web + IA", en: "Software house · Web + AI" } as L,
  /** Default <title> of each language. */
  title: { pt: "MatsuHub — Software e agentes de IA", en: "MatsuHub — Software and AI agents" } as L,
  description: {
    pt: "Software house que cria produtos web sob medida e agentes de IA que atendem, vendem e operam o seu negócio.",
    en: "A software house that builds custom web products and AI agents that answer customers, sell and run your operations.",
  } as L,
} as const;

/**
 * The homepage sections that menus link to; hrefs come from lib/i18n/sections. The header shows only
 * services and process, with the Soluções and Lab dropdowns between them; the footer lists all three.
 * "Demos" is not here on purpose: each demo is reached from its solution in the Soluções menu.
 */
export type NavSection = Exclude<SectionKey, "contact" | "demos">;
export const NAV: readonly { id: NavSection; label: L }[] = [
  { id: "services", label: { pt: "Serviços", en: "Services" } },
  { id: "agents", label: { pt: "Agentes", en: "Agents" } },
  { id: "process", label: { pt: "Processo", en: "Process" } },
];

export type ServiceId = "agentes" | "webapps" | "sites" | "automacao";
export const SERVICES: readonly { id: ServiceId; title: L; text: L; tags: readonly string[]; /** Mono caption over the illustration. */ caption: L }[] = [
  {
    id: "agentes",
    title: { pt: "Agentes de IA", en: "AI agents" },
    text: {
      pt: "Atendem no WhatsApp, qualificam leads, agendam e operam os seus sistemas — com supervisão humana.",
      en: "They answer on WhatsApp, qualify leads, book appointments and operate your systems — with human oversight.",
    },
    tags: ["LLMs", "RAG", "Tools", "WhatsApp"],
    caption: { pt: "agente · ferramentas", en: "agent · tools" },
  },
  {
    id: "webapps",
    title: { pt: "Web apps sob medida", en: "Custom web apps" },
    text: { pt: "Plataformas, portais e dashboards rápidos — do MVP à escala.", en: "Fast platforms, portals and dashboards — from MVP to scale." },
    tags: ["Next.js", "TypeScript", "Cloud"],
    caption: { pt: "painel · tempo real", en: "dashboard · real time" },
  },
  {
    id: "sites",
    title: { pt: "Sites que convertem", en: "Websites that convert" },
    text: {
      pt: "Experiências imersivas com 3D e animação que transformam visita em contato.",
      en: "Immersive 3D and motion experiences that turn visitors into leads.",
    },
    tags: ["3D", "Motion", "SEO"],
    caption: { pt: "camadas · 3D", en: "layers · 3D" },
  },
  {
    id: "automacao",
    title: { pt: "Automação & integrações", en: "Automation & integrations" },
    text: {
      pt: "Conectamos CRM, ERP, pagamento e planilha. O trabalho repetitivo some; o time foca no que importa.",
      en: "We connect your CRM, ERP, payments and spreadsheets. Repetitive work disappears; your team focuses on what matters.",
    },
    tags: ["APIs", "Webhooks", "CRM", "ERP"],
    caption: { pt: "fluxo · integrações", en: "flow · integrations" },
  },
];

/** The live site-demos, in display order. Single source for the demo bar, the closing band and the homepage picker. */
export type DemoId = "imobiliarias" | "restaurantes" | "ecommerce" | "clinicas";
export const DEMOS: readonly {
  id: DemoId;
  /** Segment label, e.g. "Imobiliárias". */
  segment: L;
  /** The fictional client brand of the demo, with a short descriptor. */
  name: L;
  /** The brand alone (footer). */
  brand: string;
  /** The demo route. The demos are Portuguese-only: fictional Brazilian clients' sites. */
  href: string;
  image: { src: string; alt: L };
  /**
   * The looping screen recording on the homepage card (re-record with scripts/record.mjs and
   * scripts/previews/*.js whenever the demo changes). `domain` is the demo's fictional address.
   */
  preview: { src: string; poster: string; domain: string };
  blurb: L;
}[] = [
  {
    id: "imobiliarias",
    segment: { pt: "Imobiliárias", en: "Real estate" },
    name: { pt: "Aurora Residence", en: "Aurora Residence" },
    brand: "Aurora",
    href: "/demos/imobiliarias",
    image: {
      src: "/aurora/exterior-dusk-1600.jpg",
      alt: { pt: "Fachada do edifício Aurora Residence ao anoitecer", en: "The Aurora Residence tower at dusk" },
    },
    preview: { src: "/previews/imobiliarias.mp4", poster: "/previews/imobiliarias.jpg", domain: AURORA.domain },
    blurb: {
      pt: "Tour 3D pelo prédio, plantas, simulador de financiamento e corretora de IA.",
      en: "3D building tour, floor plans, a mortgage simulator and an AI broker.",
    },
  },
  {
    id: "restaurantes",
    segment: { pt: "Restaurantes", en: "Restaurants" },
    name: { pt: "Maré — fogo & mar", en: "Maré — fire & sea" },
    brand: "Maré",
    href: "/demos/restaurantes",
    image: { src: "/mare/facade-1600.jpg", alt: { pt: "Fachada do restaurante Maré à noite", en: "The Maré restaurant at night" } },
    preview: { src: "/previews/restaurantes.mp4", poster: "/previews/restaurantes.jpg", domain: MARE.domain },
    blurb: {
      pt: "Tour pelo salão, cardápio vivo, reserva de mesa e maître virtual de IA.",
      en: "Dining-room tour, a living menu, table booking and an AI maître d'.",
    },
  },
  {
    id: "ecommerce",
    segment: { pt: "E-commerce", en: "E-commerce" },
    name: { pt: "Pulso — áudio", en: "Pulso — audio" },
    brand: "Pulso",
    href: "/demos/ecommerce",
    image: { src: "/pulso/one-1000.jpg", alt: { pt: "Fone de ouvido Pulso One", en: "Pulso One headphones" } },
    preview: { src: "/previews/ecommerce.mp4", poster: "/previews/ecommerce.jpg", domain: PULSO.domain },
    blurb: {
      pt: "Produto em 3D, busca por intenção, comparador e vendedor de IA.",
      en: "3D product view, search by intent, a comparison tool and an AI sales assistant.",
    },
  },
  {
    id: "clinicas",
    segment: { pt: "Clínicas", en: "Clinics" },
    name: { pt: "Elo — clínica integrada", en: "Elo — integrated clinic" },
    brand: "Elo",
    href: "/demos/clinicas",
    image: {
      src: "/clinica/facade-1600.jpg",
      alt: {
        pt: "Fachada de vidro da clínica Elo, com a recepção e a sala de espera",
        en: "The Elo clinic's glass front, with the reception desk and waiting room",
      },
    },
    preview: { src: "/previews/clinicas.mp4", poster: "/previews/clinicas.jpg", domain: ELO.domain },
    blurb: {
      pt: "Tour pela clínica, agenda com horários reais, pré-consulta e recepcionista de IA.",
      en: "Clinic tour, live appointment slots, a pre-visit check-in and an AI receptionist.",
    },
  },
];

/** The capability band between the hero and Services. */
export const MARQUEE: Localized<readonly string[]> = {
  pt: ["Agentes de IA", "Web apps", "Automação", "RAG", "WhatsApp", "Dashboards", "Integrações", "3D + motion"],
  en: ["AI agents", "Web apps", "Automation", "RAG", "WhatsApp", "Dashboards", "Integrations", "3D + motion"],
};

export type PrincipleIcon = "eye" | "link" | "pin" | "chat" | "deploy" | "check";

/** "04 — Processo": header copy, the four phases shown on the interactive stage, and the principles row. */
export const PROCESS = {
  title: { pt: "Rápido, simples e", en: "Fast, simple and" } as L,
  titleAccent: { pt: "com você em cada ciclo.", en: "with you in every cycle." } as L,
  lead: {
    pt: "Uma conversa, um protótipo navegável em dias e, depois, ciclos curtos de construir, mostrar, ouvir e ajustar — que continuam depois do lançamento.",
    en: "One conversation, a clickable prototype in days, then short cycles of build, show, listen and adjust — which carry on after launch.",
  } as L,
  loop: { pt: ["construir", "mostrar", "ouvir", "ajustar"], en: ["build", "show", "listen", "adjust"] } as Localized<readonly string[]>,
  phases: [
    {
      n: "01",
      title: { pt: "Descoberta", en: "Discovery" },
      caption: { pt: "conversa → brief", en: "conversation → brief" },
      short: { pt: "conversa → brief", en: "conversation → brief" },
      text: {
        pt: "Entendemos o negócio, o usuário e onde a IA gera resultado.",
        en: "We learn the business, the users and where AI actually pays off.",
      },
      happens: {
        pt: "Uma conversa objetiva sobre o negócio, quem vai usar e onde a IA gera resultado. Dela sai um brief de uma página.",
        en: "A focused conversation about the business, who will use it and where AI pays off. It turns into a one-page brief.",
      },
      you: {
        pt: "Conta como o trabalho funciona hoje e o que precisa mudar. Sem questionário interminável.",
        en: "Tell us how the work runs today and what needs to change. No endless questionnaires.",
      },
      get: { pt: ["Brief de uma página", "Escopo e prazo", "Onde a IA entra"], en: ["One-page brief", "Scope and timeline", "Where AI fits in"] },
    },
    {
      n: "02",
      title: { pt: "Protótipo", en: "Prototype" },
      caption: { pt: "link navegável em dias", en: "a clickable link in days" },
      short: { pt: "link em dias", en: "a link in days" },
      text: {
        pt: "Um protótipo navegável em dias, para validar antes de investir.",
        en: "A clickable prototype in days, to validate before you invest.",
      },
      happens: {
        pt: "Em dias, o brief vira um protótipo navegável: telas de verdade, num link que você abre no computador ou no celular.",
        en: "Within days, the brief becomes a clickable prototype: real screens, on a link you open on your laptop or phone.",
      },
      you: {
        pt: "Clica, testa e mostra para quem decide. A ideia é validada antes de investir na construção.",
        en: "Click through it, test it and show it to whoever decides. The idea is validated before you invest in the build.",
      },
      get: { pt: ["Protótipo navegável", "Link de prévia", "Plano da construção"], en: ["Clickable prototype", "Preview link", "Build plan"] },
    },
    {
      n: "03",
      title: { pt: "Construção", en: "Build" },
      caption: { pt: "construir · mostrar · ouvir · ajustar", en: "build · show · listen · adjust" },
      short: { pt: "ciclos com você", en: "cycles with you" },
      text: {
        pt: "Sprints curtos, deploy contínuo e você acompanhando tudo.",
        en: "Short sprints, continuous deployment and you following every step.",
      },
      happens: {
        pt: "Sprints curtos em ciclo: construímos, mostramos, ouvimos e ajustamos. Cada entrega ganha um link de prévia novo.",
        en: "Short sprints in a loop: we build, show, listen and adjust. Every delivery gets a fresh preview link.",
      },
      you: {
        pt: "Comenta direto na tela, no ponto exato. O ajuste aparece na versão seguinte — não no fim do projeto.",
        en: "Comment right on the screen, on the exact spot. The fix shows up in the next version — not at the end of the project.",
      },
      get: {
        pt: ["Versão nova a cada entrega", "Histórico de mudanças", "Deploy contínuo"],
        en: ["A new version every delivery", "Change history", "Continuous deployment"],
      },
    },
    {
      n: "04",
      title: { pt: "Evolução", en: "Evolution" },
      caption: { pt: "no ar e melhorando", en: "live and improving" },
      short: { pt: "no ar, melhorando", en: "live and improving" },
      text: {
        pt: "Monitoramos, medimos e evoluímos o produto e os agentes.",
        en: "We monitor, measure and keep improving the product and the agents.",
      },
      happens: {
        pt: "Com o produto no ar, acompanhamos o site e as conversas do agente e publicamos melhorias aos poucos.",
        en: "With the product live, we watch the site and the agent's conversations and ship improvements in small steps.",
      },
      you: {
        pt: "Vê os números num painel e decide com a gente o que vem a seguir.",
        en: "You see the numbers on a dashboard and decide with us what comes next.",
      },
      get: { pt: ["Painel de métricas", "Ciclos de melhoria", "Ajustes no agente"], en: ["Metrics dashboard", "Improvement cycles", "Agent tuning"] },
    },
  ] as readonly { n: string; title: L; caption: L; short: L; text: L; happens: L; you: L; get: Localized<readonly string[]> }[],
  principles: [
    {
      icon: "eye",
      title: { pt: "Você vê funcionando, não em PDF", en: "You see it working, not in a PDF" },
      text: {
        pt: "Desde o protótipo, tudo é um link que abre no navegador e no celular.",
        en: "From the prototype on, everything is a link that opens in your browser and on your phone.",
      },
    },
    {
      icon: "link",
      title: { pt: "Um link novo a cada entrega", en: "A new link with every delivery" },
      text: { pt: "Cada versão ganha uma prévia própria para testar e compartilhar.", en: "Each version gets its own preview to test and share." },
    },
    {
      icon: "pin",
      title: { pt: "Feedback direto na tela", en: "Feedback right on the screen" },
      text: {
        pt: "Você comenta no ponto exato da página; o ajuste entra no ciclo seguinte.",
        en: "You comment on the exact spot on the page; the fix goes into the next cycle.",
      },
    },
    {
      icon: "chat",
      title: { pt: "Um só canal de conversa", en: "One place to talk" },
      text: {
        pt: "Dúvidas, decisões e aprovações num lugar só, com quem está construindo.",
        en: "Questions, decisions and approvals in one place, with the people building it.",
      },
    },
    {
      icon: "deploy",
      title: { pt: "Publicação contínua", en: "Continuous releases" },
      text: {
        pt: "Melhorias vão ao ar aos poucos, sem um grande lançamento arriscado.",
        en: "Improvements go live in small steps, with no risky big-bang launch.",
      },
    },
    {
      icon: "check",
      title: { pt: "Sem surpresa no final", en: "No surprises at the end" },
      text: {
        pt: "Você acompanha cada ciclo, então o resultado final é o que você já viu.",
        en: "You follow every cycle, so the final result is what you've already seen.",
      },
    },
  ] as readonly { icon: PrincipleIcon; title: L; text: L }[],
  note: {
    pt: "Exemplo ilustrativo de um projeto. Telas, mensagens e números são fictícios.",
    en: "An illustrative example project. Screens, messages and numbers are fictional.",
  } as L,
} as const;

/** Homepage section copy (headers, leads and the small print around each section). */
export const HOME = {
  hero: {
    /** The four lines of the h1; the third is outlined, the fourth gradient. */
    lines: { pt: ["Software", "que pensa.", "Agentes", "que trabalham."], en: ["Software", "that thinks.", "Agents", "that work."] } as Localized<
      readonly [string, string, string, string]
    >,
    sub: {
      pt: "Criamos produtos web sob medida e agentes de IA que atendem, vendem e operam o seu negócio — 24 horas por dia.",
      en: "We build custom web products and AI agents that answer, sell and run your operations — around the clock.",
    } as L,
    scroll: { pt: "Role para explorar ↓", en: "Scroll to explore ↓" } as L,
    tags: { pt: "Web · IA · Agentes", en: "Web · AI · Agents" } as L,
  },
  services: {
    label: { pt: "01 — O que construímos", en: "01 — What we build" } as L,
    title: { pt: "Do site que vende ao agente que fecha.", en: "From the site that sells to the agent that closes." } as L,
    sub: {
      pt: "Engenharia e design no mesmo time. Entregamos software pronto para produção — não apresentações.",
      en: "Engineering and design on one team. We ship production-ready software — not slide decks.",
    } as L,
  },
  demos: {
    label: { pt: "02 — Demos por segmento", en: "02 — Demos by industry" } as L,
    title: { pt: "Veja funcionando antes de contratar.", en: "See it working before you hire us." } as L,
    sub: {
      pt: "Cada segmento ganha um site-demo vivo, com 3D, animação e um agente de IA integrado. Escolha um e abra o site completo.",
      en: "Each industry gets a live demo site, with 3D, motion and a built-in AI agent. Pick one and open the full site.",
    } as L,
    list: { pt: "Site-demos no ar", en: "Live demo sites" } as L,
    hint: { pt: "Prévia abaixo: role para ver", en: "Preview below: scroll to watch" } as L,
    hintRest: { pt: "o demo de Imobiliárias sendo montado.", en: "the real estate demo being built." } as L,
    /** Only on the English site: the demos themselves are Brazilian clients' sites. */
    language: { pt: "", en: "The demo sites are in Portuguese — they're Brazilian clients' sites." } as L,
  },
  agents: {
    label: { pt: "03 — Agentes em ação", en: "03 — Agents in action" } as L,
    title: { pt: "Não é chatbot.", en: "Not a chatbot." } as L,
    accent: { pt: "É um colega que executa.", en: "A teammate that gets things done." } as L,
    lead: {
      pt: "Nossos agentes usam ferramentas, consultam os seus sistemas e concluem tarefas de ponta a ponta — com um humano sempre no controle.",
      en: "Our agents use tools, query your systems and finish tasks end to end — with a human always in control.",
    } as L,
    proofs: [
      {
        k: { pt: "Integrados", en: "Integrated" },
        t: {
          pt: "Conectados ao seu CRM, agenda, ERP e WhatsApp — agem onde o trabalho acontece.",
          en: "Connected to your CRM, calendar, ERP and WhatsApp — they act where the work happens.",
        },
      },
      {
        k: { pt: "Contextuais", en: "In context" },
        t: {
          pt: "Treinados nas regras, no catálogo e no tom de voz do seu negócio.",
          en: "Grounded in your business's rules, catalog and tone of voice.",
        },
      },
      {
        k: { pt: "Auditáveis", en: "Auditable" },
        t: {
          pt: "Cada passo fica registrado; ações sensíveis pedem aprovação humana.",
          en: "Every step is logged; sensitive actions need human approval.",
        },
      },
    ] as readonly { k: L; t: L }[],
    note: {
      pt: "Simulação roteirizada para ilustrar o fluxo. Em produção, o agente opera nos seus sistemas reais.",
      en: "A scripted simulation to illustrate the flow. In production, the agent works inside your real systems.",
    } as L,
  },
  process: {
    label: { pt: "04 — Processo", en: "04 — Process" } as L,
  },
  contact: {
    label: { pt: "05 — Contato", en: "05 — Contact" } as L,
    title: { pt: "Vamos construir", en: "Let's build" } as L,
    titleOutline: { pt: "o seu?", en: "yours." } as L,
    lead: {
      pt: "Conte a ideia. Voltamos com um plano claro e um protótipo — para você ver funcionando antes de investir.",
      en: "Tell us the idea. We'll come back with a clear plan and a prototype — so you see it working before you invest.",
    } as L,
    formTitle: { pt: "Inicie um projeto", en: "Start a project" } as L,
    human: { pt: "resposta humana", en: "a human replies" } as L,
    nextLabel: { pt: "O que acontece depois", en: "What happens next" } as L,
    next: [
      {
        n: "01",
        t: { pt: "Lemos com atenção", en: "We read it carefully" },
        d: {
          pt: "Sua mensagem chega direto para quem vai construir — sem triagem de vendas.",
          en: "Your message goes straight to the people who will build it — no sales gatekeeping.",
        },
      },
      {
        n: "02",
        t: { pt: "Uma conversa rápida", en: "A quick conversation" },
        d: {
          pt: "Entendemos o negócio, o objetivo e onde a IA realmente gera resultado.",
          en: "We learn the business, the goal and where AI actually pays off.",
        },
      },
      {
        n: "03",
        t: { pt: "Plano e protótipo", en: "Plan and prototype" },
        d: {
          pt: "Você recebe escopo, prazo e um protótipo navegável para validar a ideia.",
          en: "You get the scope, a timeline and a clickable prototype to validate the idea.",
        },
      },
    ] as readonly { n: string; t: L; d: L }[],
    direct: { pt: "Prefere conversar direto?", en: "Prefer to talk directly?" } as L,
    whatsapp: { pt: "Falar no WhatsApp", en: "Message us on WhatsApp" } as L,
    email: { pt: "Enviar e-mail", en: "Send an email" } as L,
  },
} as const;
