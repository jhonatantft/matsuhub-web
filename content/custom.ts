/**
 * Copy for the "Sob medida" page (/solucoes/sob-medida · /en/solutions/custom): the solution that
 * isn't an industry — custom platforms, apps, integrations, data, infrastructure and AI. Same
 * conventions as content/segments.ts: every string is a { pt, en } pair, resolved with t().
 */
import type { Localized } from "@/lib/i18n/core";

type L = Localized<string>;

export const CUSTOM_SLUG: Localized<string> = { pt: "sob-medida", en: "custom" };

export const CUSTOM = {
  name: { pt: "Sob medida", en: "Custom builds" },
  /** One line in the Soluções menu. */
  nav: {
    pt: "Não está na lista? Plataformas, apps, integrações, dados e IA, do zero.",
    en: "Not on the list? Platforms, apps, integrations, data and AI, from scratch.",
  },
  navTags: { pt: "SaaS · apps · APIs · dados · cloud · IA", en: "SaaS · apps · APIs · data · cloud · AI" },
  meta: {
    title: { pt: "Software sob medida: plataformas, apps, dados e IA — MatsuHub", en: "Custom software: platforms, apps, data and AI — MatsuHub" },
    description: {
      pt: "Engenharia de software sob medida: plataformas SaaS, apps, sistemas internos, integrações, dados, cloud e agentes de IA — do primeiro diagrama ao sistema em produção.",
      en: "Custom software engineering: SaaS platforms, apps, internal systems, integrations, data, cloud and AI agents — from the first diagram to a system in production.",
    },
    service: { pt: "Desenvolvimento de software sob medida", en: "Custom software development" },
    ogAlt: { pt: "MatsuHub — software sob medida", en: "MatsuHub — custom software" },
    ogKicker: { pt: "Software sob medida", en: "Custom software" },
  },
  hero: {
    label: { pt: "Sob medida · engenharia de software", en: "Custom · software engineering" },
    title: { pt: "Se dá para desenhar,", en: "If it can be designed," },
    accent: { pt: "dá para construir.", en: "we can build it." },
    sub: {
      pt: "Plataformas, apps, integrações, dados, infraestrutura e agentes de IA — sob medida, do primeiro diagrama ao sistema rodando em produção. Engenharia para o que não pode parar.",
      en: "Platforms, apps, integrations, data, infrastructure and AI agents — custom-built, from the first diagram to a system running in production. Engineering for things that can't go down.",
    },
    cta: { pt: "Contar o meu projeto", en: "Tell us about your project" },
    ctaProcess: { pt: "Ver como trabalhamos", en: "See how we work" },
    chips: [
      { pt: "Arquitetura sob medida", en: "Custom architecture" },
      { pt: "Feito para escalar", en: "Built to scale" },
      { pt: "O código é seu", en: "You own the code" },
    ] as L[],
  },
  /** The hero's live system diagram. */
  map: {
    title: { pt: "Exemplo de arquitetura de um sistema sob medida", en: "Example architecture of a custom system" },
    caption: { pt: "Exemplo de arquitetura · tráfego simulado", en: "Example architecture · simulated traffic" },
    hint: { pt: "Passe o cursor ou toque nas peças", en: "Hover or tap the pieces" },
    legend: {
      request: { pt: "requisição", en: "request" },
      event: { pt: "evento", en: "event" },
      ai: { pt: "IA", en: "AI" },
    },
    groups: {
      channel: { pt: "canal", en: "channel" },
      entry: { pt: "entrada", en: "entry" },
      service: { pt: "serviço", en: "service" },
      ai: { pt: "IA", en: "AI" },
      data: { pt: "dados", en: "data" },
      integration: { pt: "integração", en: "integration" },
    },
    /** Order = the order the diagram walks through on its own. Positions live in ArchitectureMap. */
    nodes: [
      {
        id: "web",
        label: { pt: "Web", en: "Web" },
        name: { pt: "Site e web app", en: "Website and web app" },
        desc: {
          pt: "O que o cliente usa no navegador: rápido, acessível e fácil de achar no Google.",
          en: "What customers use in the browser: fast, accessible and easy to find on Google.",
        },
      },
      {
        id: "gateway",
        label: { pt: "Gateway", en: "Gateway" },
        name: { pt: "Gateway e autenticação", en: "Gateway and authentication" },
        desc: {
          pt: "A porta de entrada: confere quem é quem, aplica limites e direciona cada pedido.",
          en: "The front door: checks who's who, applies limits and routes every request.",
        },
      },
      {
        id: "core",
        label: { pt: "Núcleo", en: "Core" },
        name: { pt: "Regras do negócio", en: "Business logic" },
        desc: {
          pt: "Pedidos, estoque, contratos, agendas: o coração do sistema, feito para o seu fluxo.",
          en: "Orders, stock, contracts, schedules: the heart of the system, built for your workflow.",
        },
      },
      {
        id: "db",
        label: { pt: "Banco", en: "Database" },
        name: { pt: "Banco de dados", en: "Database" },
        desc: { pt: "Dados consistentes, com backup e recuperação testados.", en: "Consistent data, with tested backups and recovery." },
      },
      {
        id: "queue",
        label: { pt: "Eventos", en: "Events" },
        name: { pt: "Fila de eventos", en: "Event queue" },
        desc: {
          pt: "Tudo o que acontece vira evento: nada se perde quando o volume dispara.",
          en: "Everything that happens becomes an event: nothing gets lost when volume spikes.",
        },
      },
      {
        id: "notify",
        label: { pt: "Notificações", en: "Notifications" },
        name: { pt: "Notificações", en: "Notifications" },
        desc: {
          pt: "E-mail, push e WhatsApp disparados pelo evento certo, na hora certa.",
          en: "Email, push and WhatsApp triggered by the right event at the right time.",
        },
      },
      {
        id: "whatsapp",
        label: { pt: "WhatsApp", en: "WhatsApp" },
        name: { pt: "WhatsApp e outros canais", en: "WhatsApp and other channels" },
        desc: { pt: "O cliente conversa onde já está.", en: "Customers talk where they already are." },
      },
      {
        id: "agent",
        label: { pt: "Agentes IA", en: "AI agents" },
        name: { pt: "Agentes de IA", en: "AI agents" },
        desc: {
          pt: "Atendem, consultam e executam tarefas nos seus sistemas — com regras e aprovação humana quando precisa.",
          en: "They answer, look things up and carry out tasks in your systems — with rules and human approval when needed.",
        },
      },
      {
        id: "rag",
        label: { pt: "Busca IA", en: "AI search" },
        name: { pt: "Busca semântica", en: "Semantic search" },
        desc: {
          pt: "A IA consulta os documentos e dados da empresa para responder com base em fatos.",
          en: "The AI looks up company documents and data to answer from facts.",
        },
      },
      {
        id: "app",
        label: { pt: "App", en: "App" },
        name: { pt: "App iOS e Android", en: "iOS and Android app" },
        desc: {
          pt: "Funciona sem internet, manda notificações e sincroniza quando o sinal volta.",
          en: "Works offline, sends notifications and syncs when the signal comes back.",
        },
      },
      {
        id: "iot",
        label: { pt: "IoT", en: "IoT" },
        name: { pt: "Sensores e dispositivos", en: "Sensors and devices" },
        desc: { pt: "Máquinas, veículos e sensores mandando dados o tempo todo.", en: "Machines, vehicles and sensors sending data all the time." },
      },
      {
        id: "wh",
        label: { pt: "Warehouse", en: "Warehouse" },
        name: { pt: "Data warehouse", en: "Data warehouse" },
        desc: { pt: "Os dados de todos os sistemas juntos, prontos para análise.", en: "Data from every system in one place, ready for analysis." },
      },
      {
        id: "bi",
        label: { pt: "Painéis", en: "Dashboards" },
        name: { pt: "Painéis e alertas", en: "Dashboards and alerts" },
        desc: { pt: "Indicadores ao vivo e alerta quando algo sai do normal.", en: "Live metrics and an alert when something looks off." },
      },
      {
        id: "pay",
        label: { pt: "Pagamentos", en: "Payments" },
        name: { pt: "Pagamentos e cobrança", en: "Payments and billing" },
        desc: {
          pt: "Pix, cartão, assinaturas e nota fiscal, com conciliação automática.",
          en: "Pix, cards, subscriptions and invoicing, reconciled automatically.",
        },
      },
      {
        id: "erp",
        label: { pt: "ERP / legado", en: "ERP / legacy" },
        name: { pt: "ERP e sistemas legados", en: "ERP and legacy systems" },
        desc: {
          pt: "O que já existe continua funcionando — o sistema novo conversa com ele.",
          en: "What you already have keeps working — the new system talks to it.",
        },
      },
      {
        id: "partner",
        label: { pt: "Parceiros", en: "Partners" },
        name: { pt: "API para parceiros", en: "Partner API" },
        desc: {
          pt: "Outras empresas se conectam ao seu sistema com chave de acesso e limite de uso.",
          en: "Other companies connect to your system with access keys and usage limits.",
        },
      },
    ],
  },
  capabilities: {
    label: { pt: "01 — O que construímos", en: "01 — What we build" },
    title: { pt: "Do app ao data center.", en: "From the app to the data center." },
    accent: { pt: "Tudo no mesmo time.", en: "All in one team." },
    lead: {
      pt: "Um sistema de verdade tem front, back, dados, infraestrutura e, cada vez mais, IA. A gente cuida de todas as camadas — e de como elas conversam.",
      en: "A real system has a front end, a back end, data, infrastructure and, more and more, AI. We take care of every layer — and of how they talk to each other.",
    },
    items: [
      {
        title: { pt: "Plataformas e SaaS", en: "Platforms and SaaS" },
        text: {
          pt: "Produtos com login, planos, cobrança recorrente, várias empresas na mesma base e painel administrativo.",
          en: "Products with sign-in, plans, recurring billing, many companies on one platform and an admin panel.",
        },
        tags: { pt: "multiempresa · assinaturas · permissões", en: "multi-tenant · subscriptions · permissions" },
      },
      {
        title: { pt: "Apps iOS e Android", en: "iOS and Android apps" },
        text: {
          pt: "Apps nativos ou multiplataforma, que funcionam sem internet, mandam notificações e vão para as lojas.",
          en: "Native or cross-platform apps that work offline, send notifications and ship to the stores.",
        },
        tags: { pt: "offline · push · lojas", en: "offline · push · stores" },
      },
      {
        title: { pt: "Sistemas internos", en: "Internal systems" },
        text: {
          pt: "O ERP, o CRM ou o back-office que planilha nenhuma resolve: feito para o seu fluxo, não o contrário.",
          en: "The ERP, CRM or back office no spreadsheet can handle: built around your workflow, not the other way round.",
        },
        tags: { pt: "fluxos · aprovações · relatórios", en: "workflows · approvals · reports" },
      },
      {
        title: { pt: "Integrações e APIs", en: "Integrations and APIs" },
        text: {
          pt: "Ligamos ERP, pagamentos, nota fiscal, WhatsApp e sistemas antigos — e publicamos APIs para os seus parceiros.",
          en: "We connect ERPs, payments, invoicing, WhatsApp and legacy systems — and publish APIs for your partners.",
        },
        tags: { pt: "APIs · webhooks · filas", en: "APIs · webhooks · queues" },
      },
      {
        title: { pt: "Dados e analytics", en: "Data and analytics" },
        text: {
          pt: "Pipelines que juntam dados de vários sistemas, um data warehouse e painéis que respondem à pergunta certa.",
          en: "Pipelines that bring data together from many systems, a data warehouse and dashboards that answer the right question.",
        },
        tags: { pt: "ETL · warehouse · painéis", en: "ETL · warehouse · dashboards" },
      },
      {
        title: { pt: "IA e agentes", en: "AI and agents" },
        text: {
          pt: "Agentes que operam nos seus sistemas, busca nos documentos da empresa, automação de processos e servidores MCP.",
          en: "Agents that work inside your systems, search across company documents, process automation and MCP servers.",
        },
        tags: { pt: "agentes · RAG · MCP", en: "agents · RAG · MCP" },
      },
      {
        title: { pt: "Tempo real e IoT", en: "Real time and IoT" },
        text: {
          pt: "Rastreamento, telemetria, chat e painéis ao vivo: muitos eventos por segundo, sem travar a operação.",
          en: "Tracking, telemetry, chat and live dashboards: lots of events per second without slowing operations down.",
        },
        tags: { pt: "WebSocket · telemetria · eventos", en: "WebSocket · telemetry · events" },
      },
      {
        title: { pt: "Cloud e DevOps", en: "Cloud and DevOps" },
        text: {
          pt: "Infraestrutura como código, deploy automático, monitoramento e escala conforme a demanda.",
          en: "Infrastructure as code, automatic deploys, monitoring and scaling with demand.",
        },
        tags: { pt: "IaC · CI/CD · observabilidade", en: "IaC · CI/CD · observability" },
      },
      {
        title: { pt: "Modernização de legado", en: "Legacy modernization" },
        text: {
          pt: "Trocamos sistemas antigos por partes, sem parar a operação e sem perder dados.",
          en: "We replace old systems piece by piece, without stopping operations or losing data.",
        },
        tags: { pt: "migração · por etapas · sem parada", en: "migration · in stages · no downtime" },
      },
    ],
  },
  engineering: {
    label: { pt: "02 — Engenharia de verdade", en: "02 — Real engineering" },
    title: { pt: "Bonito por fora.", en: "Beautiful on the outside." },
    accent: { pt: "Sólido por dentro.", en: "Solid on the inside." },
    lead: {
      pt: "O que separa um sistema que aguenta crescer de um que vira dor de cabeça não aparece na tela. É isto que vem em todo projeto:",
      en: "What separates a system that can grow from one that becomes a headache doesn't show on screen. This comes with every project:",
    },
    items: [
      {
        title: { pt: "Arquitetura antes do código", en: "Architecture before code" },
        text: { pt: "As decisões ficam registradas, com o porquê de cada uma.", en: "Decisions are written down, with the reason for each one." },
      },
      {
        title: { pt: "Testes automatizados", en: "Automated tests" },
        text: { pt: "Toda mudança passa por eles antes de ir ao ar.", en: "Every change goes through them before it ships." },
      },
      {
        title: { pt: "Entrega contínua", en: "Continuous delivery" },
        text: { pt: "Versões pequenas e frequentes, com volta atrás rápida se algo der errado.", en: "Small, frequent releases, with a fast rollback if something goes wrong." },
      },
      {
        title: { pt: "Observabilidade", en: "Observability" },
        text: { pt: "Logs, métricas e alertas: o problema aparece para nós antes do seu cliente notar.", en: "Logs, metrics and alerts: we see a problem before your customers notice it." },
      },
      {
        title: { pt: "Segurança e LGPD", en: "Security and privacy" },
        text: { pt: "Dados protegidos, acesso mínimo e dependências revisadas.", en: "Protected data, least-privilege access and reviewed dependencies." },
      },
      {
        title: { pt: "Sem amarras", en: "No lock-in" },
        text: { pt: "Código, infraestrutura e documentação ficam no seu nome.", en: "Code, infrastructure and documentation are yours." },
      },
    ],
    /** The pipeline panel: one line per stage a change goes through. */
    pipeline: {
      title: { pt: "pipeline · cada mudança", en: "pipeline · every change" },
      steps: [
        { pt: "revisão de código", en: "code review" },
        { pt: "testes unitários e de integração", en: "unit and integration tests" },
        { pt: "testes de ponta a ponta", en: "end-to-end tests" },
        { pt: "análise de segurança", en: "security scan" },
        { pt: "build e ambiente de prévia", en: "build and preview environment" },
        { pt: "deploy gradual", en: "gradual rollout" },
        { pt: "monitoramento e alertas", en: "monitoring and alerts" },
      ] as L[],
      done: { pt: "no ar", en: "live" },
    },
  },
  examples: {
    label: { pt: "03 — Talvez seja algo assim", en: "03 — Maybe it looks like this" },
    title: { pt: "Problemas que cabem aqui.", en: "Problems that fit here." },
    lead: {
      pt: "Exemplos ilustrativos do tipo de projeto que fazemos. O seu pode não se parecer com nenhum — e tudo bem.",
      en: "Illustrative examples of the kind of project we take on. Yours may look like none of them — that's fine.",
    },
    problem: { pt: "O problema", en: "The problem" },
    build: { pt: "O que construímos", en: "What we build" },
    items: [
      {
        sector: { pt: "Logística", en: "Logistics" },
        problem: {
          pt: "O cliente liga o dia inteiro para saber onde está a entrega.",
          en: "Customers call all day long to ask where their delivery is.",
        },
        parts: [
          { pt: "App do motorista que funciona sem sinal", en: "Driver app that works without signal" },
          { pt: "Rastreamento em tempo real", en: "Real-time tracking" },
          { pt: "Agente no WhatsApp que responde sozinho", en: "WhatsApp agent that answers on its own" },
        ] as L[],
      },
      {
        sector: { pt: "Indústria", en: "Manufacturing" },
        problem: {
          pt: "Os dados estão em três sistemas e as decisões saem no achismo.",
          en: "The data lives in three systems and decisions come from gut feeling.",
        },
        parts: [
          { pt: "Integração com ERP e máquinas", en: "ERP and machine integration" },
          { pt: "Data warehouse", en: "Data warehouse" },
          { pt: "Painel com alertas", en: "Dashboard with alerts" },
        ] as L[],
      },
      {
        sector: { pt: "Serviços financeiros", en: "Financial services" },
        problem: {
          pt: "Analisar um pedido de crédito leva dias de papelada.",
          en: "Reviewing a credit application takes days of paperwork.",
        },
        parts: [
          { pt: "Plataforma de cadastro", en: "Onboarding platform" },
          { pt: "Leitura de documentos com IA", en: "AI document reading" },
          { pt: "Regras auditáveis e aprovação humana", en: "Auditable rules and human approval" },
        ] as L[],
      },
      {
        sector: { pt: "Startup", en: "Startup" },
        problem: {
          pt: "Tem a ideia e o prazo, mas não tem time técnico.",
          en: "There's an idea and a deadline, but no tech team.",
        },
        parts: [
          { pt: "Primeira versão do produto", en: "First version of the product" },
          { pt: "Cobrança recorrente", en: "Recurring billing" },
          { pt: "Infra pronta para crescer", en: "Infrastructure ready to grow" },
        ] as L[],
      },
    ],
  },
  process: {
    label: { pt: "04 — Como funciona", en: "04 — How it works" },
    title: { pt: "Do primeiro diagrama ao sistema no ar.", en: "From the first diagram to a live system." },
  },
  faq: {
    label: { pt: "05 — Perguntas frequentes", en: "05 — FAQ" },
    items: [
      {
        q: { pt: "Vocês fazem qualquer tipo de software mesmo?", en: "Do you really build any kind of software?" },
        a: {
          pt: "Web, apps, back-end, dados, infraestrutura e IA, sim. Se o seu projeto precisar de algo que não é a nossa praia, dizemos na primeira conversa — sem aprender às suas custas.",
          en: "Web, apps, back end, data, infrastructure and AI, yes. If your project needs something outside our expertise, we say so in the first conversation — no learning on your dime.",
        },
      },
      {
        q: { pt: "Quanto custa e quanto tempo leva?", en: "How much does it cost and how long does it take?" },
        a: {
          pt: "Depende do escopo, por isso a Descoberta vem primeiro: dela sai o escopo, a arquitetura e uma estimativa por etapas. Depois, você vê o sistema evoluir a cada ciclo.",
          en: "It depends on the scope, which is why Discovery comes first: it produces the scope, the architecture and an estimate per stage. After that, you see the system grow every cycle.",
        },
      },
      {
        q: { pt: "Vocês assumem um sistema que já existe?", en: "Can you take over an existing system?" },
        a: {
          pt: "Sim. Começamos com um diagnóstico do código e da infraestrutura, resolvemos o que é urgente e evoluímos o resto por partes, sem parar a operação.",
          en: "Yes. We start with a review of the code and infrastructure, fix what's urgent and evolve the rest piece by piece, without stopping operations.",
        },
      },
      {
        q: { pt: "O código fica com quem?", en: "Who owns the code?" },
        a: {
          pt: "Com você. Repositório, infraestrutura e documentação ficam na sua conta — se um dia quiser seguir com outro time, ele começa de onde paramos.",
          en: "You do. The repository, infrastructure and documentation live in your accounts — if you ever move to another team, they start where we left off.",
        },
      },
    ],
  },
  cta: {
    label: { pt: "Próximo passo", en: "Next step" },
    title: { pt: "Conte o problema.", en: "Tell us the problem." },
    accent: { pt: "A gente desenha a solução.", en: "We'll design the solution." },
    text: {
      pt: "Uma conversa sem compromisso: você explica o que precisa e sai com uma primeira ideia de arquitetura e de caminho.",
      en: "A conversation with no strings attached: you explain what you need and leave with a first idea of the architecture and the path.",
    },
    button: { pt: "Contar o meu projeto", en: "Tell us about your project" },
    segments: { pt: "Ver soluções por segmento", en: "See solutions by industry" },
  },
} as const;
