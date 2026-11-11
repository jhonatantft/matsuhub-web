/**
 * Scripted, deterministic "agent runs" for the Agents section. Nothing here is real data:
 * the panel is labelled "simulação". Timings are in animation seconds; `ms` on a tool call
 * is the simulated latency shown to the reader.
 */

export type IconName =
  | "chat"
  | "crm"
  | "calendar"
  | "book"
  | "card"
  | "building"
  | "box"
  | "truck"
  | "person"
  | "clipboard"
  | "swap"
  | "bell";

export type Tool = {
  id: string;
  label: string;
  icon: IconName;
  /** Position in the graph, % of its box. */
  x: number;
  y: number;
};

export type Step =
  | { kind: "in"; tool: string; channel: string; from: string; text: string }
  | { kind: "think"; text: string }
  | { kind: "tool"; tool: string; call: string; result: string; ms: number }
  | { kind: "reply"; tool: string; text: string }
  | { kind: "done"; tool: string; outcomes: string[] };

export type Scenario = {
  id: string;
  tab: string;
  agent: string;
  tools: Tool[];
  steps: Step[];
};

/* Six slots around the core (core sits at 50% / 50%). */
const SLOTS = [
  { x: 9, y: 14 },
  { x: 5, y: 50 },
  { x: 9, y: 86 },
  { x: 91, y: 14 },
  { x: 95, y: 50 },
  { x: 91, y: 86 },
] as const;
const at = (i: number) => SLOTS[i];

export const SCENARIOS: Scenario[] = [
  {
    id: "imobiliaria",
    tab: "Imobiliária",
    agent: "sdr-imobiliária",
    tools: [
      { id: "whatsapp", label: "WhatsApp", icon: "chat", ...at(0) },
      { id: "kb", label: "Base de conhecimento", icon: "book", ...at(1) },
      { id: "team", label: "Corretor", icon: "person", ...at(2) },
      { id: "crm", label: "CRM", icon: "crm", ...at(3) },
      { id: "units", label: "Imóveis", icon: "building", ...at(4) },
      { id: "agenda", label: "Agenda", icon: "calendar", ...at(5) },
    ],
    steps: [
      {
        kind: "in",
        tool: "whatsapp",
        channel: "WhatsApp",
        from: "Marina",
        text: "Oi! Vocês têm apartamento de 3 quartos perto da praia? Dá pra visitar no sábado?",
      },
      {
        kind: "think",
        text: "Intenção de compra, perfil família, urgência alta. Qualificar, buscar unidades de 3 quartos e reservar um horário no sábado.",
      },
      { kind: "tool", tool: "crm", call: 'crm.qualificar(lead: "Marina")', result: "lead quente · faixa até R$ 2 mi", ms: 240 },
      {
        kind: "tool",
        tool: "units",
        call: "imoveis.buscar({ quartos: 3, perto_da_praia: true })",
        result: "4 unidades · melhor match: 1804, vista mar",
        ms: 410,
      },
      { kind: "tool", tool: "agenda", call: 'agenda.reservar("sáb", unidade: 1804)', result: "visita reservada · sáb 10:00", ms: 320 },
      {
        kind: "reply",
        tool: "whatsapp",
        text: "Encontrei 4 opções de 3 quartos — a 1804 tem vista para o mar. Reservei sábado às 10h para você conhecer. Te mando a localização por aqui!",
      },
      { kind: "tool", tool: "crm", call: 'crm.atualizar(etapa: "visita agendada")', result: "negócio movido no funil", ms: 180 },
      { kind: "done", tool: "team", outcomes: ["visita agendada", "CRM atualizado", "corretor avisado"] },
    ],
  },
  {
    id: "clinica",
    tab: "Clínica",
    agent: "recepção-clínica",
    tools: [
      { id: "whatsapp", label: "WhatsApp", icon: "chat", ...at(0) },
      { id: "kb", label: "Base de conhecimento", icon: "book", ...at(1) },
      { id: "team", label: "Recepção", icon: "person", ...at(2) },
      { id: "patients", label: "Pacientes", icon: "clipboard", ...at(3) },
      { id: "agenda", label: "Agenda", icon: "calendar", ...at(4) },
      { id: "remind", label: "Lembretes", icon: "bell", ...at(5) },
    ],
    steps: [
      {
        kind: "in",
        tool: "whatsapp",
        channel: "WhatsApp",
        from: "Carlos",
        text: "Bom dia! Não vou conseguir ir na consulta de quinta. Dá pra passar pra terça de manhã?",
      },
      {
        kind: "think",
        text: "Pedido de remarcação. Localizar a consulta, conferir a política e buscar terça de manhã com a mesma médica.",
      },
      { kind: "tool", tool: "patients", call: 'pacientes.consulta_atual("Carlos")', result: "qui 14:00 · Dra. Helena · dermatologia", ms: 190 },
      { kind: "tool", tool: "kb", call: "politicas.remarcacao()", result: "sem custo com 24 h de antecedência", ms: 150 },
      { kind: "tool", tool: "agenda", call: 'agenda.remarcar("ter", manha: true)', result: "ter 09:30 confirmado · quinta liberada", ms: 360 },
      {
        kind: "reply",
        tool: "whatsapp",
        text: "Feito, Carlos! Sua consulta com a Dra. Helena passou para terça às 9h30, sem custo. Na segunda à noite eu te lembro por aqui.",
      },
      { kind: "tool", tool: "remind", call: 'lembretes.agendar("seg 18:00", canal: "whatsapp")', result: "lembrete programado", ms: 120 },
      { kind: "done", tool: "team", outcomes: ["consulta remarcada", "horário liberado", "lembrete agendado"] },
    ],
  },
  {
    id: "ecommerce",
    tab: "E-commerce",
    agent: "suporte-loja",
    tools: [
      { id: "whatsapp", label: "WhatsApp", icon: "chat", ...at(0) },
      { id: "kb", label: "Base de conhecimento", icon: "book", ...at(1) },
      { id: "team", label: "Atendimento", icon: "person", ...at(2) },
      { id: "orders", label: "Pedidos", icon: "box", ...at(3) },
      { id: "returns", label: "Trocas", icon: "swap", ...at(4) },
      { id: "shipping", label: "Logística", icon: "truck", ...at(5) },
    ],
    steps: [
      {
        kind: "in",
        tool: "whatsapp",
        channel: "WhatsApp",
        from: "Juliana",
        text: "Meu pedido 48213 chegou, mas o tênis ficou pequeno. Consigo trocar por um número maior?",
      },
      {
        kind: "think",
        text: "Troca por tamanho. Conferir o pedido e o prazo de troca, abrir a troca para o 38 e gerar a etiqueta.",
      },
      { kind: "tool", tool: "orders", call: 'pedidos.consultar("48213")', result: "entregue há 3 dias · Tênis Runner 37", ms: 210 },
      { kind: "tool", tool: "kb", call: "politicas.trocas()", result: "troca grátis em até 30 dias", ms: 140 },
      { kind: "tool", tool: "returns", call: "trocas.abrir({ de: 37, para: 38 })", result: "troca T-1192 aberta · 38 reservado", ms: 380 },
      { kind: "tool", tool: "shipping", call: 'logistica.etiqueta("T-1192")', result: "etiqueta de postagem gerada", ms: 450 },
      {
        kind: "reply",
        tool: "whatsapp",
        text: "Pronto, Juliana! Abri a troca e já reservei o 38 para você. A etiqueta está no seu e-mail — é só postar, sem custo.",
      },
      { kind: "done", tool: "team", outcomes: ["troca aberta", "etiqueta enviada", "estoque reservado"] },
    ],
  },
];

/* ───────────── Timeline ───────────── */

export type TimedStep = Step & { start: number; end: number; sim: number; simStart: number };
export type Timeline = { steps: TimedStep[]; total: number; simTotal: number };

const LEAD_IN = 0.35;
const GAP = 0.22;
export const TYPE_CPS = 52; // reply typing speed, characters per second

function animDuration(s: Step): number {
  switch (s.kind) {
    case "in":
      return 0.7;
    case "think":
      return 1.5;
    case "tool":
      return 1.05 + s.ms / 1000;
    case "reply":
      return s.text.length / TYPE_CPS + 0.2;
    case "done":
      return 0.6;
  }
}

/** Simulated wall-clock seconds each step costs (what the reader sees on the clock). */
function simDuration(s: Step): number {
  switch (s.kind) {
    case "in":
      return 0;
    case "think":
      return 0.9;
    case "tool":
      return s.ms / 1000;
    case "reply":
      return 1.3;
    case "done":
      return 0.1;
  }
}

export function buildTimeline(sc: Scenario): Timeline {
  let t = LEAD_IN;
  let sim = 0;
  const steps = sc.steps.map((s) => {
    const d = animDuration(s);
    const sd = simDuration(s);
    const timed = { ...s, start: t, end: t + d, sim: sd, simStart: sim } as TimedStep;
    t += d + GAP;
    sim += sd;
    return timed;
  });
  return { steps, total: t, simTotal: sim };
}

export const TIMELINES = SCENARIOS.map(buildTimeline);

/** Phase of a tool call (0..1 of the step): the call travels out, then the result comes back. */
export const CALL_OUT = 0.42;
export const CALL_BACK = 0.78;

export const fmtSeconds = (s: number) => `${s.toFixed(1).replace(".", ",")} s`;
